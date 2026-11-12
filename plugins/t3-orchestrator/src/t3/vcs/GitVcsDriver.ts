/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/vcs/GitVcsDriver.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): T3's tag and IO types for `resolveCommit`, the one
// member the lifted service calls (for `isolation: "worktree"`). dsh runs `git rev-parse`.
import type { GitCommandError } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface GitResolveCommitInput {
  cwd: string;
  revision: string;
}

export interface GitResolveCommitResult {
  commitSha: string;
}

export class GitVcsDriver extends Context.Service<
  GitVcsDriver,
  {
    readonly resolveCommit: (
      input: GitResolveCommitInput,
    ) => Effect.Effect<GitResolveCommitResult, GitCommandError>;
  }
>()("t3/vcs/GitVcsDriver") {}
