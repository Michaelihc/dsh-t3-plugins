# @deepseek-ai/dsh-t3-orchestrator

Private prototype. This package runs T3 Code's orchestrator MCP inside a dsh Host, so dsh Sessions and ACP coding
agents (Kimi Code, Qwen Code, Qoder, CodeBuddy, MiniMax, GLM) and native Codex can act as the main conversation backend, delegate to one another, and coordinate durable threads.

The ten tools, with their descriptions, schemas, results, statuses, wait and wake behaviour, and credential rules, are
T3's own code at `4c8eb1dfd5`: `orchestrator_capabilities`, `delegate_task`, `task_status`, `task_cancel`,
`create_threads`, `t3_thread_list`, `t3_thread_read`, `t3_thread_send`, `t3_thread_wait` and `t3_thread_interrupt`.
[PORTING.md](PORTING.md) lists every lifted file and each deviation that dsh forces.

## How it works

- The plugin serves T3's streamable HTTP MCP endpoint (protocol `2025-06-18`) on loopback, using bearer credentials
  scoped to one session. Only token hashes are kept; credentials expire after a liveness window and are revoked
  when the run ends.
- A dsh Session gets the tools natively, as `mcp__dsh-orchestrator__<tool>`, and calls them in process.
- An ACP child receives the endpoint in `session/new`/`session/load`. Agents that advertise
  `mcpCapabilities.http` connect over HTTP. Others go through T3's stdio bridge (`lib/bridge.js`).
- Threads persist in the plugin's storage domain. An ACP child is resumed with `session/load` when the agent supports
  it, and otherwise from the thread's portable transcript.
- When a task finishes, the parent is woken with T3's completion text: a steer for a busy dsh Session, otherwise a
  queued turn.
- Every ACP thread is also a dsh Session, on the model route `t3-acp/<agent>`, whose transcript shows the agent's messages, reasoning and tool calls. The route is recorded before the first request and listed in the model catalog under the agent's display name, so the composer identifies the agent rather than the Host's default model. The `t3Threads` Host service gives thread lists T3's lineage and Waiting state.

## Configure

```yaml
- name: '@deepseek-ai/dsh-t3-orchestrator'
  config:
    runtimeMode: full-access        # how child permission requests are answered (see Permissions)
    dshAgentOptions: { provider: deepseek-official, model: deepseek-v4-flash }   # used for dsh children
    agents:
      - id: kimi-code
        displayName: Kimi Code
        command: C:/Users/<you>/.kimi-code/bin/kimi.exe
        args: [acp]
      - id: qwen-code
        command: npx.cmd
        args: [-y, '@qwen-code/qwen-code@0.27.0', --acp, --experimental-skills]
      - id: codex
        displayName: Codex
        driver: codex
        command: codex
        args: []
```

[scripts/agents.ts](scripts/agents.ts) has the ACP Registry commands for all six agents.

When `agents` is absent or empty, the plugin detects installed agents once at start and logs what it found. An
agent is included only when its own executable exists: on PATH (with PATHEXT on Windows; relative PATH entries are
ignored), in its own install directory, or in a global package directory (`%APPDATA%\npm`, `%LOCALAPPDATA%\pnpm`,
`~/.local/bin`, `~/.npm-global/bin`, `~/.bun/bin`, `~/.volta/bin`, pnpm's home, `/usr/local/bin`,
`/opt/homebrew/bin`). Detection reads the filesystem only. It never starts an agent, signs in or downloads a
package, so an agent that only `npx -y` could fetch is not listed. Each detected agent becomes an entry with the
executable's absolute path:

| id | displayName | Executable | args |
|---|---|---|---|
| `kimi-code` | Kimi Code | `~/.kimi-code/bin/kimi(.exe)`, else `kimi` | `acp` |
| `qwen-code` | Qwen Code | `qwen` | `--acp --experimental-skills` |
| `qoder` | Qoder CLI | `qodercli` | `--acp` |
| `codebuddy-code` | CodeBuddy Code | `codebuddy`, else `codebuddy-code` | `--acp` |
| `minimax-code` | MiniMax Code | `mcode` | `acp` |
| `glm-acp-agent` | GLM ACP agent | `glm-acp-agent` | none |
| `codex` (`driver: codex`) | Codex | `codex` | none |

A configured `agents` list replaces detection entirely. Other options are
`serverKey` (default `dsh-orchestrator`), `host`, `port` (default `0`, which picks any free port),
`livenessWindowMs`, `idleTimeoutMs`, `probeTtlMs`, `worktreeRoot`, `environmentId`, and
`handoffTokenCap` (default 16,000 tokens, range 1,024–64,000).
`orchestrator_capabilities` probes ACP with `initialize` and a disposable `session/new`; Codex uses
`initialize`, `account/read` and `model/list`, without starting a model turn. Probes never sign in. Each agent's
last finished probe is reused; once older than `probeTtlMs` (default 10 minutes) it is refreshed in the background
while the old result still answers. A tool call therefore waits only for agents that have never finished a probe,
and a delegation whose target the old result rules out re-probes that target alone before refusing, as T3 does.

### Permissions

No person answers a child's permission requests; `runtimeMode` (or a narrower `runtimeMode` passed to
`delegate_task`) decides them.

| Mode | ACP agents | dsh Sessions the orchestrator creates | Codex |
|---|---|---|---|
| `full-access` | Allow every request | Sandbox off, approvals rejected | Sandbox off |
| `auto` | Allow every request | Workspace-write sandbox, approvals rejected | Workspace-write, no network |
| `auto-accept-edits` | Allow `think`; allow `read`, `search`, `edit` and `delete` only for paths inside the thread's workspace; reject the rest, including `execute`, `fetch` and `move` | Workspace-write sandbox, approvals rejected | Workspace-write, no network |
| `approval-required` | Reject every request | Read-only sandbox, approvals rejected | Read-only |

An ACP request is confined only when it names its paths, in `locations` or in the tool's announced input; one that
names none is rejected. Symlinks and junctions are followed, and Windows paths compare case-insensitively.
[PORTING.md](PORTING.md#forced-deviations) has the exact rule. dsh's sandbox and Codex's confine writes only, so
their children can still read outside the workspace.

Provider selection belongs inside `target`, for example `delegate_task({ task: 'Review this code', target: { providerInstanceId: 'kimi-code' } })`. Native dsh tool calls reject unknown top-level arguments rather than allowing T3's decoder to strip a misplaced target and select the default provider.

## Main conversations and context handoff

Configured or detected native agents appear under **Native agents** in the composer model picker. Selecting an ACP agent runs its actual CLI; `driver: codex` runs the actual Codex app-server with its native authentication and configuration. The relay provider id remains `t3-acp` for compatibility; it does not imply that Codex uses ACP. Selecting a native route does not require a DeepSeek API key. The relay currently selects each native agent's default model; explicit underlying model and effort controls in the composer are deferred.

Switch backends while idle. The same DSH conversation and transcript are retained. On entry or re-entry into a native agent, the plugin starts a fresh native thread with a full historical-context handoff followed by the new user message. The intact-item selection, omission reporting and historical-context labels are T3's pinned `handoffBudget.ts` implementation. Its budget counts one token per Unicode code point rather than T3's one per UTF-8 byte, so a Chinese conversation keeps about as much history as an English one of the same length. The exact handoff is recorded as an orchestrator notice, not as a human request. A failed handoff turn is retried with fresh context. Continued turns reuse the native thread without replaying the handoff. Switching back to a DSH model uses the conversation's existing durable history.

This adaptation uses T3's `full_thread_summary` strategy, not its cached-target delta strategy. It transfers recorded user and assistant text plus source-labelled tool-call and tool-result evidence under the same intact-item budget. Historical tools are never executed; native tool state, attachments and reasoning state are not replayed. Omitted history is explicitly reported. There is no new conversation or silent context reset. Accepted engine runs retain their selected provider. A selection change between native tool steps stops the old turn with an actionable error; a new message continues on the selected backend with a handoff. Setup failures settle pending runs and cancel native work instead of leaving it active.

DSH's separate [Codex subagent bundle](../../subagent/subagent-codex/README.md) remains an alternative for one-shot `subagent_codex` tasks. It is independent of this plugin's persistent Codex threads.

For prebuilt-bundle installation and the source-build fallback, see [FRIENDS-TRYOUT.md](../../../FRIENDS-TRYOUT.md).

### Validation scope

Fixtures exercise DSH → ACP/Codex → DSH → native switches, continued native turns, persisted Codex resume,
permission policy, cancellation, teardown, native relay events and an actual authenticated MCP delegation
from the Codex main-Session fixture to an ACP child. A real signed-in Kimi CLI also recovered a
random code from a prior DSH conversation through the handoff. Codex has a read-only probe against installed
CLI 0.153.4; no real Codex model turn or paid request was made. Native plan mode, attachments, steering and
interactive approval forwarding are not supported. Tarball install and authenticated Host-shell boot pass
against the source-built Web profile; separate stock npm/Desktop and rendered browser acceptance remain unverified.
The root aggregate `build:check` still fails on project-boundary TS6305/TS6307 and retained upstream unused-import
TS6133/TS6192 errors; standalone package and
integration-test typechecks are the narrower passing gates.

## Develop

```sh
corepack pnpm exec vitest run packages/experimental/t3-orchestrator          # native app-server/ACP fixtures and mock LLM
corepack pnpm exec tsc -p packages/experimental/t3-orchestrator/tsconfig.json
corepack pnpm --filter @deepseek-ai/dsh-t3-orchestrator exec tsdown           # lib/index.js, lib/bridge.js
node packages/experimental/t3-orchestrator/scripts/sync-t3.mjs <t3code-clone> --drift
corepack pnpm tsx packages/experimental/t3-orchestrator/scripts/probe-agents.ts [out-file]
corepack pnpm tsx packages/experimental/t3-orchestrator/scripts/live-kimi.ts <evidence-dir>   # costs Kimi tokens
```
