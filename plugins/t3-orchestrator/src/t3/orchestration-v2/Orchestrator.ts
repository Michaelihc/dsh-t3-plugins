/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/Orchestrator.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). The error classes, error union and dispatch result
// below are copied verbatim (except the runtime-policy helper they no longer need); the service
// shape is the subset of T3's OrchestratorV2Shape that the lifted MCP code calls, with T3's
// signatures. dsh implements it in src/dsh/engine.ts. See PORTING.md.
import {
  CommandId,
  managedRuntimeModeCeilingMessage,
  type NodeId,
  type OrchestrationV2Run,
  type OrchestrationV2ServerCommand,
  type OrchestrationV2StoredEvent,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2ThreadProjection,
  type OrchestrationV2ThreadShell,
  type OrchestrationV2ThreadShellSnapshot,
  ProviderInstanceId,
  ProviderInteractionMode,
  RuntimeMode,
  ThreadId,
} from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as Stream from "effect/Stream";

import type {
  ProjectionRecordField,
  ProjectionRecordFilter,
  ProjectionRecords,
  ProjectionTimelinePage,
  ProjectionTimelinePageOptions,
  ShellSnapshotOptions,
} from "./ProjectionStore.ts";

export class OrchestratorDispatchError extends Schema.TaggedError<OrchestratorDispatchError>()(
  "OrchestratorDispatchError",
  {
    commandId: CommandId,
    commandType: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Failed to dispatch orchestration command ${this.commandType} (${this.commandId}).`;
  }
}

export class OrchestratorThreadAlreadyExistsError extends Schema.TaggedError<OrchestratorThreadAlreadyExistsError>()(
  "OrchestratorThreadAlreadyExistsError",
  { commandId: CommandId, threadId: ThreadId },
) {
  override get message(): string {
    return `Thread ${this.threadId} already exists. Use a new thread id.`;
  }
}

export class OrchestratorCommandRejectedError extends Schema.TaggedError<OrchestratorCommandRejectedError>()(
  "OrchestratorCommandRejectedError",
  { commandId: CommandId, commandType: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {
  override get message(): string {
    return `Orchestration command ${this.commandType} (${this.commandId}) was rejected before commit.`;
  }
}

export class OrchestratorProjectionError extends Schema.TaggedError<OrchestratorProjectionError>()(
  "OrchestratorProjectionError",
  {
    threadId: ThreadId,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Failed to load orchestration projection for thread ${this.threadId}.`;
  }
}

const isOrchestratorProjectionError = Schema.is(OrchestratorProjectionError);

export class OrchestratorDomainEventStreamError extends Schema.TaggedError<OrchestratorDomainEventStreamError>()(
  "OrchestratorDomainEventStreamError",
  {
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return "Failed while streaming orchestration domain events.";
  }
}

export class OrchestratorProviderAdapterError extends Schema.TaggedError<OrchestratorProviderAdapterError>()(
  "OrchestratorProviderAdapterError",
  {
    commandId: CommandId,
    providerInstanceId: ProviderInstanceId,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Provider adapter failed while dispatching orchestration command ${this.commandId}.`;
  }
}

export class OrchestratorSubagentThreadReadOnlyError extends Schema.TaggedError<OrchestratorSubagentThreadReadOnlyError>()(
  "OrchestratorSubagentThreadReadOnlyError",
  { commandId: CommandId, threadId: ThreadId },
) {
  override get message(): string {
    return "This subagent is run by its provider and cannot take messages. Message the parent thread instead.";
  }
}

export class OrchestratorThreadAboveModeLimitError extends Schema.TaggedError<OrchestratorThreadAboveModeLimitError>()(
  "OrchestratorThreadAboveModeLimitError",
  {
    commandId: CommandId,
    threadId: ThreadId,
    mode: Schema.Literals(["runtime", "interaction"]),
    runtimeMode: RuntimeMode,
    interactionMode: ProviderInteractionMode,
  },
) {
  override get message(): string {
    return `Thread ${this.threadId} now runs in ${this.runtimeMode}/${this.interactionMode} mode, above what this caller may change.`;
  }
}

export class OrchestratorRuntimeModeAboveCeilingError extends Schema.TaggedError<OrchestratorRuntimeModeAboveCeilingError>()(
  "OrchestratorRuntimeModeAboveCeilingError",
  {
    commandId: CommandId,
    threadId: ThreadId,
    refused: Schema.Literals(["mode", "turn"]),
    runtimeMode: RuntimeMode,
    maxRuntimeMode: RuntimeMode,
    organization: Schema.String,
  },
) {
  override get message(): string {
    const limit = managedRuntimeModeCeilingMessage(this.organization, this.maxRuntimeMode);
    return this.refused === "turn" ? `${limit} Switch this thread's mode to continue.` : limit;
  }
}

export class OrchestratorCommandPreviouslyRejectedError extends Schema.TaggedError<OrchestratorCommandPreviouslyRejectedError>()(
  "OrchestratorCommandPreviouslyRejectedError",
  {
    commandId: CommandId,
    commandType: Schema.String,
    detail: Schema.String,
  },
) {
  override get message(): string {
    return `Command ${this.commandId} was previously rejected: ${this.detail}`;
  }
}

export class OrchestratorCommandIdConflictError extends Schema.TaggedError<OrchestratorCommandIdConflictError>()(
  "OrchestratorCommandIdConflictError",
  {
    commandId: CommandId,
    commandType: Schema.String,
    receiptThreadId: ThreadId,
    commandThreadId: ThreadId,
  },
) {
  override get message(): string {
    return `Command ${this.commandId} was already handled for thread ${this.receiptThreadId} and cannot be replayed for ${this.commandThreadId}.`;
  }
}

export const OrchestratorV2Error = Schema.Union([
  OrchestratorDispatchError,
  OrchestratorThreadAlreadyExistsError,
  OrchestratorCommandRejectedError,
  OrchestratorProjectionError,
  OrchestratorDomainEventStreamError,
  OrchestratorProviderAdapterError,
  OrchestratorCommandPreviouslyRejectedError,
  OrchestratorCommandIdConflictError,
  OrchestratorSubagentThreadReadOnlyError,
  OrchestratorThreadAboveModeLimitError,
  OrchestratorRuntimeModeAboveCeilingError,
]);
export type OrchestratorV2Error = typeof OrchestratorV2Error.Type;

export interface OrchestratorV2DispatchResult {
  readonly sequence: number;
  readonly storedEvents: ReadonlyArray<OrchestrationV2StoredEvent>;
  /** The command id was already accepted; analytics skip it. */
  readonly replayed?: true;
}

/** The subset of T3's OrchestratorV2Shape that the lifted MCP and thread-management code calls. */
export interface OrchestratorV2Shape {
  readonly delegatedTaskResultPending: (
    childThreadId: ThreadId,
    taskId?: NodeId,
  ) => Effect.Effect<boolean, OrchestratorProjectionError>;
  readonly restartContinuationPending: (run: OrchestrationV2Run) => Effect.Effect<boolean>;
  readonly awaitRestartContinuation: (run: OrchestrationV2Run) => Effect.Effect<void>;
  readonly dispatch: (
    command: OrchestrationV2ServerCommand,
  ) => Effect.Effect<OrchestratorV2DispatchResult, OrchestratorV2Error>;
  readonly getTimelinePage: (
    threadId: ThreadId,
    options: ProjectionTimelinePageOptions,
  ) => Effect.Effect<ProjectionTimelinePage, OrchestratorProjectionError>;
  readonly getThreadRecords: <K extends ProjectionRecordField>(
    threadId: ThreadId,
    fields: ReadonlyArray<K>,
    filter?: ProjectionRecordFilter,
  ) => Effect.Effect<ProjectionRecords<K>, OrchestratorV2Error>;
  readonly listAppOwnedChildThreadIds: (
    threadId: ThreadId,
  ) => Effect.Effect<ReadonlyArray<ThreadId>, OrchestratorV2Error>;
  readonly getThreadProjection: (
    threadId: ThreadId,
  ) => Effect.Effect<OrchestrationV2ThreadProjection, OrchestratorV2Error>;
  readonly getShellSnapshot: (
    options?: ShellSnapshotOptions,
  ) => Effect.Effect<OrchestrationV2ThreadShellSnapshot, OrchestratorV2Error>;
  readonly getThreadShell: (
    threadId: ThreadId,
  ) => Effect.Effect<OrchestrationV2ThreadShell | null, OrchestratorV2Error>;
  readonly getThreadEventSequence: (
    threadId: ThreadId,
  ) => Effect.Effect<number, OrchestratorV2Error>;
  readonly streamStoredEventsFrom: (input?: {
    readonly threadId?: ThreadId;
    readonly afterSequence?: number;
    readonly eventType?: OrchestrationV2DomainEvent["type"];
  }) => Stream.Stream<OrchestrationV2StoredEvent, OrchestratorV2Error>;
}

export class OrchestratorV2 extends Context.Service<OrchestratorV2, OrchestratorV2Shape>()(
  "t3/orchestration-v2/Orchestrator/OrchestratorV2",
) {}
