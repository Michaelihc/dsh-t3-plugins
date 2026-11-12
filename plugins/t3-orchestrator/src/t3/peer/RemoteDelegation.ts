/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/peer/RemoteDelegation.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): T3's tag and the two members the lifted service calls.
// dsh has no linked environments; its implementation answers as T3 does with linked
// environments off (`linkedEnvironmentsOff`). See PORTING.md "Forced deviations".
import type {
  EnvironmentId,
  NodeId,
  OrchestrationV2Subagent,
  OrchestratorMcpDelegateTaskInput,
  OrchestratorMcpFailure,
  OrchestratorMcpTaskCancelResult,
} from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type * as McpInvocationContext from "../mcp/McpInvocationContext.ts";

type ThreadScope = McpInvocationContext.McpThreadInvocationScope;

export class RemoteDelegation extends Context.Service<
  RemoteDelegation,
  {
    readonly delegate: (
      scope: ThreadScope,
      input: OrchestratorMcpDelegateTaskInput & {
        readonly target: NonNullable<OrchestratorMcpDelegateTaskInput["target"]> & {
          readonly environmentId: EnvironmentId;
        };
      },
    ) => Effect.Effect<{ readonly taskId: NodeId }, OrchestratorMcpFailure>;
    readonly cancel: (
      scope: ThreadScope,
      task: OrchestrationV2Subagent,
      input: {
        readonly reason?: string | undefined;
        readonly clientRequestId?: string | undefined;
      },
    ) => Effect.Effect<OrchestratorMcpTaskCancelResult, OrchestratorMcpFailure>;
  }
>()("t3/peer/RemoteDelegation") {}
