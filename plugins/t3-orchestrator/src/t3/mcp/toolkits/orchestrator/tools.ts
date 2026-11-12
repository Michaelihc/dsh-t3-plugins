/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// Lifted from T3 Code apps/server/src/mcp/toolkits/orchestrator/tools.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Adapted at the dsh boundary; every change is listed in PORTING.md.
import {
  OrchestratorMcpCapabilitiesInput,
  OrchestratorMcpCapabilitiesResult,
  OrchestrationV2StopWorkflowInput,
  OrchestratorMcpEnvironmentLinkInput,
  OrchestratorMcpEnvironmentLinkResult,
  OrchestratorMcpEnvironmentLinksResult,
  OrchestratorMcpEnvironmentUnlinkInput,
  OrchestratorMcpEnvironmentUnlinkResult,
  OrchestratorMcpCreateThreadsInput,
  OrchestratorMcpCreateThreadsResult,
  OrchestratorMcpDelegateTaskInput,
  OrchestratorMcpDelegateTaskResult,
  OrchestratorMcpDeleteScheduledTaskInput,
  OrchestratorMcpDeleteScheduledTaskResult,
  OrchestratorMcpEnvironmentTarget,
  OrchestratorMcpRequestSecretInput,
  OrchestratorMcpRequestSecretResult,
  OrchestratorMcpFailure,
  OrchestratorMcpListScheduledTasksInput,
  OrchestratorMcpListScheduledTasksResult,
  OrchestratorMcpSaveScheduledTaskInput,
  OrchestratorMcpScheduleTaskResult,
  OrchestratorMcpTaskCancelInput,
  OrchestratorMcpTaskCancelResult,
  OrchestratorMcpTaskStatusInput,
  OrchestratorMcpThreadInterruptInput,
  OrchestratorMcpThreadInterruptResult,
  OrchestratorMcpThreadListInput,
  OrchestratorMcpThreadListResult,
  OrchestratorMcpThreadReadInput,
  OrchestratorMcpThreadReadResult,
  OrchestratorMcpThreadSendInput,
  OrchestratorMcpThreadSendResult,
  OrchestratorMcpThreadWaitInput,
  OrchestratorMcpThreadWaitResult,
  ThreadMetadataMcpUpdateInput,
  ThreadMetadataMcpUpdateResult,
  TrimmedNonEmptyString,
} from "../../../contracts/index.ts";
import { McpSchema, Tool, Toolkit } from "effect/ai";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as OrchestratorMcpService from "../../OrchestratorMcpService.ts";

const dependencies = [
  McpInvocationContext.McpInvocationContext,
  ThreadManagementService.ThreadManagementService,
  OrchestratorMcpService.OrchestratorMcpService,
];

const OrchestratorCapabilitiesTool = Tool.make("orchestrator_capabilities", {
  description:
    "List providers, models, options, and runtime modes for `delegate_task`. Short list. `search` finds others. Any catalog model works.",
  parameters: OrchestratorMcpCapabilitiesInput,
  success: OrchestratorMcpCapabilitiesResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Get orchestration capabilities")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const DelegateTaskTool = Tool.make("delegate_task", {
  description:
    "Start one child agent with only `task`. No parent history. Separate checkout or PR per child: `isolation:'worktree'`. Keep `taskId` for `task_status` and `task_cancel`. No secrets in `task`.",
  parameters: OrchestratorMcpDelegateTaskInput,
  success: OrchestratorMcpDelegateTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Delegate a child task")
  .annotate(Tool.Destructive, true)
  .annotate(Tool.OpenWorld, true);

const TaskStatusTool = Tool.make("task_status", {
  description:
    "Read one delegated task you started. Do not call it on a running task before its completion wakes you. `workState`: working, waiting_for_children, result_available. A finished turn with live child work is not done. `summary`: final result. Reading it marks it delivered.",
  parameters: OrchestratorMcpTaskStatusInput,
  success: OrchestratorMcpDelegateTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Get delegated task status")
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const TaskCancelTool = Tool.make("task_cancel", {
  description:
    "Stop one delegated task by `taskId`. Stops its running and queued turns, its delegates, and its PR watches, including later runs in its child thread. A finished task keeps its result.",
  parameters: OrchestratorMcpTaskCancelInput,
  success: OrchestratorMcpTaskCancelResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Cancel delegated task")
  .annotate(Tool.Destructive, true);

const CreateThreadsTool = Tool.make("create_threads", {
  description:
    "Create new top-level threads in this checkout. Not delegation. One thread or its own worktree: `t3_thread_launch`. Project, branch, and worktree inherit.",
  parameters: OrchestratorMcpCreateThreadsInput,
  success: OrchestratorMcpCreateThreadsResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Create T3 threads")
  .annotate(Tool.Destructive, true)
  .annotate(Tool.OpenWorld, true);

const ThreadListTool = Tool.make("t3_thread_list", {
  description:
    "List threads newest first, in one project or with `allProjects`. Page with `cursor`.",
  parameters: OrchestratorMcpThreadListInput,
  success: OrchestratorMcpThreadListResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "List T3 threads")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const ThreadReadTool = Tool.make("t3_thread_read", {
  description:
    "Read any thread by id. `messages` (default): user and assistant messages and plans. `activity`: all timeline items. Keep reads small: low `limit` and `maxCharsPerItem`. Page with `afterPosition=nextPosition`. Cut-off text: `itemId` with `textOffset=nextTextOffset`. Reading a child's final result marks it delivered. In your reply, name it as its `link` verbatim.",
  parameters: OrchestratorMcpThreadReadInput,
  success: OrchestratorMcpThreadReadResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Read a T3 thread")
  .annotate(Tool.Strict, true)
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const ThreadSendTool = Tool.make("t3_thread_send", {
  description:
    "Send a message to any thread. The target cannot run with broader modes than yours. `mode:'auto'` starts an idle thread, steers a running turn, or queues. `queue`: new turn. `steer`: mid-turn update. `restart`: interrupt and restart. A send to a finished child thread starts a fresh task and returns its `taskId`. In your reply, name it as its `link` verbatim.",
  parameters: OrchestratorMcpThreadSendInput,
  success: OrchestratorMcpThreadSendResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Send to a T3 thread")
  .annotate(Tool.Destructive, true)
  .annotate(Tool.OpenWorld, true);

const ThreadWaitTool = Tool.make("t3_thread_wait", {
  description:
    "Wait for a thread's run to finish. No `runId`: latest. Idle: at once. On timeout, with `next` end your turn; without, call again.",
  parameters: OrchestratorMcpThreadWaitInput,
  success: OrchestratorMcpThreadWaitResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Wait for a T3 thread")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const ThreadInterruptTool = Tool.make("t3_thread_interrupt", {
  description:
    "Interrupt a top-level thread's running turn. No `runId`: newest running turn. No effect when idle. For a delegate, use `task_cancel`.",
  parameters: OrchestratorMcpThreadInterruptInput,
  success: OrchestratorMcpThreadInterruptResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Interrupt a T3 thread")
  .annotate(Tool.Destructive, true);

export const OrchestratorToolkit = Toolkit.make(
  OrchestratorCapabilitiesTool,
  DelegateTaskTool,
  TaskStatusTool,
  TaskCancelTool,
  CreateThreadsTool,
  ThreadListTool,
  ThreadReadTool,
  ThreadSendTool,
  ThreadWaitTool,
  ThreadInterruptTool,
);
