# Porting notes

This package runs T3 Code's orchestrator MCP, lifted from
[pingdotgg/t3code](https://github.com/pingdotgg/t3code) at
`4c8eb1dfd503fa94986c51b84532604c2abe54bb` (MIT, see [THIRD_PARTY.md](THIRD_PARTY.md)).

- Re-sync verbatim files: `node scripts/sync-t3.mjs <t3code-clone>` (refuses any other commit
  until `PINNED` is bumped deliberately).
- See what changed upstream in every lifted file since the pin: `node scripts/sync-t3.mjs <clone> --drift`.
- Regenerate the tool-surface reference: `node scripts/generate-t3-schemas.mjs <clone>`.
  `tests/parity.spec.ts` checks the live endpoint's `tools/list` against it.

## Layout

| Layer | Where | Status |
|---|---|---|
| T3 code, verbatim | `src/t3/**` files headed `Lifted verbatim` | Copied by `scripts/sync-t3.mjs`; only `@t3tools/*` import specifiers are rewritten |
| T3 code, adapted | `src/t3/**` files headed `Lifted from` | Upstream copy with the deletions listed below |
| dsh boundary | `src/t3/**` files headed `dsh boundary` | dsh implementations of T3 server modules the lifted code imports, at T3's module paths, keeping T3's service tags and signatures |
| dsh runtime | `src/dsh/*`, `src/index.ts`, `src/bridge-main.ts` | The V2 orchestrator subset, ACP and dsh-Session drivers, provider snapshots, Effect composition, Cordis plugin |

## Lifted verbatim (106 files)

- `packages/contracts/src/*.ts` (all 78 non-test files, including upstream `index.ts`) → `src/t3/contracts/`
- `packages/shared/src/`: `threadLinks`, `connectAuth`, `remote`, `mcpResponsePayloads`, `model`, `Array`,
  `orchestrationV2ThreadError`, `orchestrationV2PendingBackgroundWork`, `t3McpToolPresentation`,
  `threadPullRequests`, `socketFrameParts` → `src/t3/shared/`
- `packages/provider-core/src/server/`: `subagentProjection`, `notification`, `mcpSession` → `src/t3/provider-core/`
- `apps/server/src/mcp/`: `McpSessionRegistry`, `McpInvocationContext`, `McpToolAccess`, `threadAccess`,
  `linkOrigin`, `AcpMcpStdioBridge`, `advertisedJsonSchema`, `delegatedTaskModes` → `src/t3/mcp/`
- `apps/server/src/orchestration-v2/`: `DispatchModeLimit`, `RestartBackgroundNote`, `UserFacingErrors` → `src/t3/orchestration-v2/`
- `apps/server/src/requestUrl.ts`, `rpcInitialItems.ts` → `src/t3/`
- `apps/server/src/auth/RpcAuthorization.ts` → `src/t3/auth/` (used by `@deepseek-ai/dsh-t3-environment`)

## Lifted with changes (6 files)

| Local file | Upstream path | Changes |
|---|---|---|
| `src/t3/mcp/toolkits/orchestrator/tools.ts` | `apps/server/src/mcp/toolkits/orchestrator/tools.ts` | Deletions only: the `Tool.make` statements and toolkit entries of the tools not ported (below) and their dependency lists and imports. The ten ported definitions are unchanged. |
| `src/t3/mcp/toolkits/orchestrator/handlers.ts` | `apps/server/src/mcp/toolkits/orchestrator/handlers.ts` | Deletions only: handlers of the tools not ported and their imports. |
| `src/t3/mcp/OrchestratorMcpService.ts` | `apps/server/src/mcp/OrchestratorMcpService.ts` | Deletions: the scheduled-task and `request_secret` methods, their helpers, shape members and layer requirements. One edit: `features.scheduledTasks` is `false`. The ten ported methods and every helper they use are unchanged. |
| `src/t3/orchestration-v2/ThreadManagementService.ts` | `apps/server/src/orchestration-v2/ThreadManagementService.ts` | Kept: all errors and types, the run helpers, `dispatch`, `getProjectThreadRecords`, `listProjectThreads`, `sendToThread`, `waitForThread`, `interruptThread`, `stopDelegatedTasks`, enablement checks and receipts, verbatim. Removed: legacy-transcript import, force stop, workflows, background waits, settlement, transcripts and snapshot pass-throughs. The shape interface is the subset in use, with T3's member signatures. |
| `src/t3/mcp/McpHttpServer.ts` | `apps/server/src/mcp/McpHttpServer.ts` | Kept verbatim: the bearer-auth middleware (mode limits, 401 body, linked-environment gate), `decodeAsAdvertised`, `withToolSpans`, `withAdvertisedSchemas`, `provideRegistrationServices`, `layerInProcessMcpServer`, and `layerMcpTransport` with `protocols: [v2025_06_18]` and session termination. Removed: preview, device, html, snapshot and the other toolkits, and the product-analytics wrapper. Server name and version come from `MCP_SERVER_INFO`. |
| `src/t3/provider-core/handoffBudget.ts` | `packages/provider-core/src/server/handoffBudget.ts` | One edit: T3 estimates one token per UTF-8 byte (`Buffer.byteLength`); dsh estimates one token per Unicode code point (`estimateTokens`) for the current user text, the history cost and each candidate item. A CJK character is three UTF-8 bytes, so the byte estimate charged Chinese conversations about three times what the tokenizers of the targeted agents (Kimi, Qwen, DeepSeek, GLM, Codex) spend, and handoffs dropped history that fit. One per code point stays pessimistic for ASCII and CJK text, and the `max(16,000, window / 4)` reserve still applies. The 64,000 cap (`HANDOFF_BYTE_CAP`) counts the same estimate. Imports are rewritten as in verbatim files; `scripts/sync-t3.mjs` lists the file under `ADAPTED`, so a re-sync never overwrites it and `--drift` still reports upstream changes. |

Lifted tests in `tests/t3/` come from the same commit: `McpSessionRegistry.test.ts`,
`AcpMcpStdioBridge.test.ts` and `advertisedJsonSchema.test.ts` (imports only; `vi` comes from `vitest`, and the
fake environment drops `getDescriptor`), and `toolkits/orchestrator/tools.test.ts` (without the `t3_thread_update` case).

## dsh boundary modules

Each keeps T3's tag and members at T3's path. Every one is implemented in `src/dsh/runtime.ts`.

| Module | dsh implementation |
|---|---|
| `orchestration-v2/Orchestrator.ts` (`OrchestratorV2`) | `src/dsh/engine.ts`: projections per thread from T3's snapshot events, plus the commands the lifted code dispatches. Error classes, the error union and the dispatch result are copied verbatim. |
| `orchestration-v2/ProjectionStore.ts` | Record and filter types only, copied verbatim. |
| `orchestration-v2/CommandReceiptStore.ts` | Receipts kept by the engine. |
| `orchestration-v2/ProviderAdapterRegistry.ts`, `provider/ProviderRegistry.ts` | `src/dsh/providers.ts`: configured ACP agents (driver `acpRegistry`), Codex and `dsh`. Without configured agents, the installed ones that `src/dsh/detect.ts` finds. |
| `serverSettings.ts` | T3's `DEFAULT_SERVER_SETTINGS`, with configured instances in `providerInstances`. |
| `environment/ServerEnvironment.ts` | `environmentId` config (default `dsh-local`). |
| `project/ProjectService.ts` | A project is a working directory. |
| `vcs/GitVcsDriver.ts`, `orchestration-v2/ThreadLaunchService.ts` | `git rev-parse` for `resolveCommit`. Worktrees are created when the child thread is created, so `prepareRun` has nothing left to do. |
| `peer/PeerForwarding.ts`, `peer/RemoteDelegation.ts` | The tag, `remoteTarget` and `linkedEnvironmentsOff` (verbatim). Remote delegation always fails with `linkedEnvironmentsOff`. |
| `auth/EnvironmentAuth.ts` | `parseBearerToken`, verbatim. |
| `orchestration-v2/ThreadSettlementService.ts` | `isSnoozed`, verbatim. |
| `sourceControl/threadPullRequests.ts` | Re-exports `visibleThreadPullRequests`. |

## Forced deviations

- Linked environments: dsh has none, so this Host runs as T3 with linked environments off. A foreign `environmentId` gets T3's `linkedEnvironmentsOff` failure, and the link tools are absent.
- V2 orchestrator: T3's SQL event store, provider adapters and checkpoints have no dsh equivalent. `src/dsh/engine.ts` reimplements the command subset (`thread.create`, `message.dispatch`, `delegated_task.*`, `thread.stop`, `run.interrupt`, `queued-run.cancel`, `subagent.stop`, `thread.created.record`, and for drivers that answer runtime requests `runtime-request.respond` and `thread.user-input.dismiss`) with T3's record shapes and T3's own child-thread, title, result and wake-text helpers.
- Runs: each run has one attempt. There are no restart continuations (`restartContinuationPending` is always false) and no checkpoints. dsh has no rollback.
- Runtime requests: dsh has no surface where a person answers an ACP child's permission request. `src/dsh/permissions.ts` answers by the thread's runtime mode. `full-access` and `auto` allow. `auto-accept-edits` allows `think`, and allows `read`, `search`, `edit` and `delete` only when every path the request names is inside the thread's workspace (its worktree, else its project directory); `delete` must name a path below the workspace root. It rejects every other kind: `move` because ACP does not require the destination to be listed, and `fetch` because a fetch can reach loopback services or send workspace data (Codex at this mode runs without network). `approval-required` rejects everything. `hasPendingQuestion` and `pendingApproval` therefore never become set.
- Confinement rule: the paths are the request's `locations` plus well-known path fields of its `rawInput` (`path`, `file_path`, `paths`, `directory` and similar). A request that carries only a `toolCallId` is judged by the kind, locations and input its `tool_call` update announced. A request that names no path is rejected, since its target cannot be checked. Each path is resolved against the workspace and walked component by component, following symlinks and junctions as the operating system would (so `link/..` is the link target's parent), then compared with the workspace's real path, case-insensitively on Windows. Paths starting with `~`, `$` or `%`, Windows drive-relative, device (`\\?\`, `\\.\`) and reserved-name paths, and components with trailing dots or spaces or `:` are rejected. The rule trusts the agent to report the paths its tool acts on; it does not confine the agent's own process.
- Restart after a Host restart: runs left active are marked interrupted. T3 instead recovers provider sessions.
- Settings: dsh has no T3 settings file. Every configured or detected instance is enabled, with no model preferences, favorites or administrator policy.
- `features.scheduledTasks` is `false`: the scheduled-task tools are not ported.
- Pull requests, settlement and snooze: dsh threads have no PR links, watches or snooze. Lists report `settled: false` and `snoozed: false`.
- `isolation: "worktree"`: dsh creates a detached `git worktree` from the parent commit under `worktreeRoot`. T3's prepared launch would also run project setup scripts, and dsh has none.
- dsh-native callers: dsh Sessions call the tools in process through T3's `layerInProcessMcpServer`, named `mcp__<serverKey>__<tool>` as dsh's MCP client names server tools. The scope's provider session is the dsh Session.
- dsh Session modes: dsh has no per-Session runtime or interaction mode. A dsh Session that calls the tools records the `runtimeMode` and `interactionMode` config (default `full-access`/`default`) as its thread's modes and keeps the permission preset its user chose. A dsh Session the orchestrator creates for a thread instead gets the thread's runtime mode as dsh permission knobs, appended as `source: 'delegation'` events before the Agent is published, as dsh's own subagents are: approval policy `never` (no person answers a child's prompts), and sandbox `danger-full-access` for `full-access`, `workspace-write` for `auto` and `auto-accept-edits`, `read-only` for `approval-required`. Each knob is set only when its service (`sandboxPolicy`, `approval`) is composed. dsh's sandbox confines writes, not reads, so such a child can read outside its workspace in every mode, as Codex can.
- dsh thread ids: T3's `create_threads` ids contain `:`, which can't be a dsh Session id (a file name on Windows), so such Sessions use a stable hash of the thread id.
- ACP threads as dsh Sessions: T3 shows every thread in its own chat view. dsh renders only Sessions, so each ACP thread is backed by a dsh Session whose model route is `t3-acp/<agent id>` (`src/dsh/acp-session.ts`). That route's adapter does not call a model. It relays the ACP prompt AcpRunDriver is running for the thread, so the Session's loop records the agent's messages, reasoning and tool calls and reports running and finished like any Session. Each ACP tool call ends a step as a call of the `acp_tool_call` card tool, whose execution waits for the agent's tool to finish and returns its output; the next step keeps reading the same prompt. The Session is composed from dsh's default preset, so dsh's context injections (runtime, skills, time) appear in its log; they never reach the agent.
- The delegated prompt is the child Session's first message, recorded as an orchestrator notice (dsh shows it collapsed as "Execution requested"), not as a person's message.
- Thread lists: dsh's Session list has no T3 lineage, pending background work or thread-wait state. The plugin provides a `t3Threads` Host service with each thread's `isListedThreadLineage`, parent, `blockedOnThreadWait` and whether `backgroundWorkHoldsCompletion`, for the T3 inbox.
- dsh Sessions call the tools as `mcp__<serverKey>__<tool>`, which T3's tool resolver does not know. Their calls are recorded under T3's bare tool names, so T3's presentation and wait detection apply.
- `t3_thread_list` shows a dsh Session once the orchestrator knows it: one that called a tool, or one the orchestrator created. dsh's Session list is not imported wholesale.
- Outside MCP-client parents: T3 issues thread credentials only to provider sessions, but the brief needs a parent MCP script. `OrchestratorRuntime.openExternalParent` issues one with a live run. Such a parent has no provider to wake, so it reads results with `mode: "wait"`, `task_status` or `t3_thread_wait`.
- Build: two contract exports exceed TypeScript declaration emit (T3 compiles with `noEmit`). The package therefore typechecks with `noEmit`, bundles from `src` with tsdown, and is outside the root `tsc -b` aggregate.

## Not ported

From T3's orchestrator toolkit: `t3_workflow_stop` and `t3_background_wait` (Claude-only features),
`schedule_task`, `list_scheduled_tasks`, `delete_scheduled_task`, `request_secret`,
`t3_thread_update`, and `t3_environment_links`/`link`/`unlink`. T3's other toolkits are not
ported either: preview, device, html, project (`t3_thread_launch`), thread, worktree, pull
requests and attachments.

## Native main conversations and handoff

The handoff budgeting and intact historical-item selection helper in `src/t3/provider-core/handoffBudget.ts` is lifted from `packages/provider-core/src/server/handoffBudget.ts` at the pinned T3 commit, with the token estimate listed under [Lifted with changes](#lifted-with-changes-6-files). `src/dsh/handoff.ts` connects it to durable Session messages and textual tool evidence, preserving historical labels, intact-item selection and omission reporting. `handoffTokenCap` maps the profile's budget to the helper (default 16,000, accepted range 1,024–64,000).

DSH's adaptation uses a fresh native thread and `full_thread_summary` on each backend entry or re-entry, not T3's cached-target delta strategy. The exact text is persisted as a `t3-context-handoff` message source; only a successfully completed turn establishes delivery. Current input is taken from the current Session turn's sequence range so cancelled prompts remain historical. Both typed and engine-dispatched runs use the handoff. Native processes and accepted runs retain their selected provider; changing backends between tool steps interrupts the old turn rather than abandoning it silently.

`src/dsh/codex.ts` adapts T3's app-server policy, MCP configuration and lifecycle to DSH's spawn/engine/observer interfaces. It does not copy T3's managed home or authentication broker. Exact source references, protocol evidence and deliberate policy differences are in `src/dsh/codex-PORTING.ts`. `driver: codex` uses the genuine persistent Codex app-server; the existing `t3-acp` relay id is retained for compatibility and does not put Codex behind ACP. Main Sessions can select any configured or detected native agent from the existing composer catalog.
