/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/ProjectionStore.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): only its exported record and filter types, copied
// verbatim (the private fork helper between them is dropped). dsh's projection store is
// src/dsh/engine.ts. See PORTING.md.
import type {
  MessageId,
  NodeId,
  OrchestrationV2ContextTransfer,
  OrchestrationV2ConversationMessage,
  OrchestrationV2ProjectedTurnItem,
  OrchestrationV2Run,
  OrchestrationV2RuntimeRequest,
  OrchestrationV2ThreadProjection,
  OrchestrationV2TurnItem,
  ProjectId,
  ProviderThreadId,
  RunAttemptId,
  RunId,
  RuntimeRequestId,
  ThreadId,
  TurnItemId,
} from "../contracts/index.ts";

export interface ProjectionRecordFilter {
  readonly providerThreadIds?: ReadonlyArray<ProviderThreadId>;
  readonly providerTurnAttemptIds?: ReadonlyArray<RunAttemptId>;
  readonly messageRoles?: ReadonlyArray<OrchestrationV2ConversationMessage["role"]>;
  readonly monitorNotificationsOnly?: boolean;
  readonly turnItemRunId?: RunId;
  readonly messageIds?: ReadonlyArray<MessageId>;
  readonly messageRunIds?: ReadonlyArray<RunId>;
  readonly turnItemRunIds?: ReadonlyArray<RunId | null>;
  readonly turnItemNodeIds?: ReadonlyArray<NodeId>;
  readonly runIds?: ReadonlyArray<RunId>;
  readonly runStatuses?: ReadonlyArray<OrchestrationV2Run["status"]>;
  /** Keeps the thread's highest-ordinal run even when `runStatuses` excludes it. */
  readonly includeLatestRun?: true;
  readonly providerTurnThreadIds?: ReadonlyArray<ProviderThreadId>;
  /** Only the provider turn whose token usage was updated last. */
  readonly latestProviderTurnUsageOnly?: true;
  readonly runtimeRequestStatuses?: ReadonlyArray<OrchestrationV2RuntimeRequest["status"]>;
  readonly contextTransferStatuses?: ReadonlyArray<OrchestrationV2ContextTransfer["status"]>;
  readonly subagentIds?: ReadonlyArray<NodeId>;
  readonly subagentRunIds?: ReadonlyArray<RunId>;
  readonly nodeIds?: ReadonlyArray<NodeId>;
  readonly turnItemRequestIds?: ReadonlyArray<RuntimeRequestId>;
  readonly turnItemTypes?: ReadonlyArray<OrchestrationV2TurnItem["type"]>;
  readonly turnItemStatuses?: ReadonlyArray<OrchestrationV2TurnItem["status"]>;
  readonly omitSettledLeafNodes?: boolean;
  /**
   * Skips ended subagents whose completion was acknowledged, delivered or disposed, unless their
   * run is active or `except` names them.
   */
  readonly omitSettledSubagents?: true | { readonly except: ReadonlyArray<NodeId> };
}

export type ProjectionRecordField = Exclude<
  keyof OrchestrationV2ThreadProjection,
  "thread" | "updatedAt" | "visibleTurnItems"
>;
export type ProjectionRecords<K extends ProjectionRecordField> = Pick<
  OrchestrationV2ThreadProjection,
  "thread" | K
>;

export interface ProjectionTimelinePageOptions {
  readonly afterPosition?: number;
  readonly itemId?: TurnItemId;
  readonly attachmentId?: string;
  readonly view?: "messages" | "activity";
  readonly limit: number;
}
export interface ProjectionTimelinePage {
  readonly items: ReadonlyArray<OrchestrationV2ProjectedTurnItem>;
  readonly totalItems: number;
  readonly hasMore: boolean;
}

export interface ShellSnapshotOptions {
  readonly location?: "active" | "archive";
  readonly projectId?: ProjectId;
  readonly unsettledOnly?: boolean;
  /**
   * Only the threads sharing this thread's `lineage.rootThreadId`: the root, its forks, and their
   * subagent trees. The thread may be deleted: forks keep a deleted source's root.
   */
  readonly familyOf?: ThreadId;
  readonly worktreePath?: string;
  readonly threadIds?: ReadonlyArray<ThreadId>;
}
