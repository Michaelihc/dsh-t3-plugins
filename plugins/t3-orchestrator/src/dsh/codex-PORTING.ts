/**
 * Native Codex integration notes.
 *
 * Adaptation sources (MIT, Copyright (c) 2026 T3 Tools Inc., pinned 4c8eb1dfd5):
 * - apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:
 *   codexRuntimeModeTurnDefaults, codexThreadRuntimeParams, and turn/start ordering.
 * - packages/effect-codex-app-server: NDJSON handshake and request correlation.
 * - apps/server/src/provider/CodexManagedRuntime.ts: native runtime ownership;
 *   its managed token broker/shadow-home implementation is deliberately not ported.
 * The package THIRD_PARTY.md contains T3's MIT notice. The driver adapts the policy
 * and MCP request construction, rather than copying Effect runtime infrastructure.
 * DSH subagent-codex wire.ts supplies the unattended server-request response forms.
 *
 * Integration:
 * - AcpAgentConfig.driver === 'codex' selects CodexRunDriver; absence remains ACP.
 * - CodexRunDriver accepts an AcpDriverOptions variable, including its unused bridge.
 *   requestTimeoutMs is optional (30 seconds); idleTimeoutMs bounds live idle reuse;
 *   cancelGraceMs bounds cooperative interruption before terminating the child.
 * - startRun/interrupt/steer/canSteer implement RunDriver; close/dispose/isLive support
 *   AcpSessionBridge. canSteer is false. Spawn argv is command + args + app-server.
 * - engine.runStarted receives nativeThreadId, persisted as a strong codex nativeId.
 *   Live follow-ups reuse the process; idle/close/restart resumes that id. A failed
 *   resume fails the run without silently starting an empty context. freshContext
 *   closes the old process and uses thread/start instead of thread/resume.
 * - Engine run model 'default' omits native overrides; explicit model, reasoningEffort
 *   and serviceTier selections are sent on turn/start. Thread/turn policy is explicit.
 * - The shared observer receives agent_message_chunk/agent_thought_chunk and paired
 *   tool_call/tool_call_update with stable toolCallId, rawInput/rawOutput and terminal
 *   status. Engine ingestion precedes observer callbacks; ended fires once per run.
 * - Issue one MCP credential per native process and override only the configured
 *   mcp_servers.<serverKey> with endpoint, Authorization and a 3900-second tool timeout.
 *   Revoke after process disposal; callbacks never log or persist that credential.
 * - probeCodexAgent initializes, reads account without refresh, then pages model/list.
 *   It returns AcpProbe, never starts a thread/turn/login, and reports a null account
 *   requiring OpenAI auth as unavailable. Custom unauthenticated providers remain usable.
 *
 * Unattended policy: approval-required uses read-only; auto/auto-accept-edits use
 * workspace-write with network disabled; full-access alone bypasses the sandbox.
 * Every turn reasserts policy after resume. All modes decline interactive approvals,
 * grant no additional permissions and provide no user-input or elicitation answers.
 * Auto uses the user reviewer, unlike T3's auto_review, because this bridge has no
 * approval UI or managed reviewer. Authentication and CODEX_HOME belong to native Codex.
 *
 * Protocol evidence: generated TypeScript bindings from the repository-installed
 * @openai/codex 0.153.4 native binary, and its read-only empty-home account probe.
 * Fake native subprocess integration covers persistence, reuse, observer/Session
 * projection, policy, cancellation, transport failure, and cleanup. No real model
 * turn or paid API request is part of these checks. Model/tool execution fidelity
 * still requires separately authorized real-provider testing; plan mode, attachments,
 * steering, native session listing, and managed authentication are not implemented.
 */
export {}
