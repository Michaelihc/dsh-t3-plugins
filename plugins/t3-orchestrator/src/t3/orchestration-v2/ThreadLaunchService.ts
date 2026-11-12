/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/ThreadLaunchService.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): T3's tag with `prepareRun`, which prepares the
// workspace a run asked for (a new worktree for `isolation: "worktree"`) and then releases it.
import type { CommandId, RunId, ThreadId } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface ThreadLaunchPreparationInput {
  readonly commandId: CommandId;
  readonly threadId: ThreadId;
  readonly runId: RunId;
}

export class ThreadLaunchService extends Context.Service<
  ThreadLaunchService,
  {
    readonly prepareRun: (input: ThreadLaunchPreparationInput) => Effect.Effect<void>;
  }
>()("t3/orchestration-v2/ThreadLaunchService") {}
