/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/project/ProjectService.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). `ProjectOperationError` is copied verbatim; the service
// keeps `getById`. A dsh project is a working directory (src/dsh/engine.ts).
import { type Project, ProjectId } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export class ProjectOperationError extends Schema.TaggedError<ProjectOperationError>()(
  "ProjectOperationError",
  {
    operation: Schema.Literals([
      "normalize-workspace",
      "read-project",
      "list-projects",
      "list-threads",
      "delete-thread",
      "dispatch-project-command",
    ]),
    projectId: Schema.optional(ProjectId),
    workspaceRoot: Schema.optional(Schema.String),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Project operation '${this.operation}' failed${this.projectId === undefined ? "" : ` for ${this.projectId}`}.`;
  }
}

export class ProjectService extends Context.Service<
  ProjectService,
  {
    readonly getById: (
      projectId: ProjectId,
      options?: { readonly includeDeleted?: boolean },
    ) => Effect.Effect<Option.Option<Project>, ProjectOperationError>;
  }
>()("t3/project/ProjectService") {}
