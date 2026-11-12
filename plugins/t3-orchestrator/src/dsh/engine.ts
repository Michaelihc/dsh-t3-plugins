/**
 * The dsh boundary under the lifted T3 code: a small V2 orchestrator. It keeps
 * one `OrchestrationV2ThreadProjection` per thread, applies T3's snapshot-style
 * domain events (`thread.created`, `run.updated`, `subagent.updated`, …), and
 * implements the commands the lifted MCP service dispatches. Providers (ACP
 * agents, dsh Sessions) execute runs through {@link RunDriver} and report back
 * through the ingestion methods. Record shapes come from T3's contracts, and
 * the delegated-task records are built with T3's own helpers.
 *
 * T3's real orchestrator (apps/server/src/orchestration-v2/Orchestrator.ts) is
 * event-sourced on SQL with provider adapters; dsh has neither, so this file is
 * a reimplementation of the subset in use. Each behaviour cites the T3 code it
 * follows. See PORTING.md.
 */
import { randomUUID } from 'node:crypto'
import * as DateTime from 'effect/DateTime'
import * as Schema from 'effect/Schema'
import {
  CommandId,
  ContextTransferId,
  EventId,
  MessageId,
  NodeId,
  OrchestrationV2ThreadProjection,
  ProjectId,
  ProviderThreadId,
  ProviderTurnId,
  RunAttemptId,
  RunId,
  RuntimeRequestId,
  ThreadId,
  TurnItemId,
  type ModelSelection,
  type OrchestrationV2AppThread,
  type OrchestrationV2ContextTransfer,
  type OrchestrationV2ConversationMessage,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2ExecutionNode,
  type OrchestrationV2ProjectedTurnItem,
  type OrchestrationV2ProviderThread,
  type OrchestrationV2ProviderTurn,
  type OrchestrationV2PendingRuntimeRequestSummary,
  type OrchestrationV2Run,
  type OrchestrationV2RunAttempt,
  type OrchestrationV2RuntimeRequest,
  type OrchestrationV2UserInputQuestion,
  type OrchestrationV2ServerCommand,
  type OrchestrationV2StoredEvent,
  type OrchestrationV2Subagent,
  type OrchestrationV2ThreadShell,
  type OrchestrationV2TurnItem,
  type ProviderApprovalDecision,
  type ProviderApprovalOption,
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderRequestKind,
  type ProviderUserInputAnswers,
} from '../t3/contracts/index.ts'
import {
  delegatedTaskProgress,
  makeSubagentChildThread,
  subagentResultForRun,
  subagentThreadTitle,
} from '../t3/provider-core/subagentProjection.ts'
import { OrchestratorDispatchError, OrchestratorProjectionError } from '../t3/orchestration-v2/Orchestrator.ts'
import { deriveBlockedOnThreadWait, derivePendingBackgroundWork } from '../t3/shared/orchestrationV2PendingBackgroundWork.ts'
import type {
  ProjectionRecordField,
  ProjectionRecordFilter,
  ProjectionRecords,
  ProjectionTimelinePage,
  ProjectionTimelinePageOptions,
  ShellSnapshotOptions,
} from '../t3/orchestration-v2/ProjectionStore.ts'

type Projection = OrchestrationV2ThreadProjection
type Mutable<T> = { -readonly [K in keyof T]: T[K] extends ReadonlyArray<infer E> ? E[] : T[K] }
type MutableProjection = Mutable<Projection>
type TerminalRunStatus = 'completed' | 'failed' | 'interrupted' | 'cancelled'
type MessageDispatch = Extract<OrchestrationV2ServerCommand, { readonly type: 'message.dispatch' }>

/** Executes runs for one provider instance. */
export interface RunDriver {
  /** Start executing a run that the engine moved to `starting`. */
  startRun(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): void
  /** Deliver text into a running turn; false when the provider cannot steer. */
  steer(threadId: ThreadId, run: OrchestrationV2Run, text: string): boolean
  /** Stop a running run. `cancelled` is a Stop, `interrupted` an interrupt. */
  interrupt(threadId: ThreadId, runId: RunId, intent: 'interrupted' | 'cancelled'): void
  /** Whether a running turn of this provider can take mid-turn input. */
  readonly canSteer: boolean
  /**
   * Deliver a client's answer to a pending runtime request (approval or question).
   * Throws with a user-facing message when the provider cannot take it.
   */
  respond?(threadId: ThreadId, request: OrchestrationV2RuntimeRequest, response: RuntimeRequestResponse): void
}

/** A client's answer to a runtime request, as `runtime-request.respond` carries it. */
export interface RuntimeRequestResponse {
  readonly decision?: ProviderApprovalDecision
  readonly feedback?: string
  readonly answers?: ProviderUserInputAnswers
}

/** The card a runtime request shows: an approval or a question, with the fields T3's turn items carry. */
export type RuntimeRequestCard =
  | {
    readonly type: 'approval_request'
    readonly requestKind: ProviderRequestKind
    readonly prompt?: string
    readonly reason?: string
    readonly options?: ReadonlyArray<ProviderApprovalOption>
  }
  | {
    readonly type: 'user_input_request'
    readonly questions: ReadonlyArray<OrchestrationV2UserInputQuestion>
    readonly responseMode?: 'message'
  }

/** Write-through persistence for projections and receipts. */
export interface EngineBackend {
  load(): { readonly projections: ReadonlyArray<unknown>; readonly receipts: ReadonlyArray<[string, string]> }
  saveProjection(threadId: string, encoded: unknown): void
  saveReceipt(commandId: string, threadId: string): void
}

export interface EngineOptions {
  readonly backend: EngineBackend
  readonly driverFor: (providerInstanceId: ProviderInstanceId) => RunDriver | undefined
  readonly driverKindOf: (providerInstanceId: ProviderInstanceId) => ProviderDriverKind
  readonly log?: (message: string) => void
  /** Create a git worktree for `isolation: "worktree"`; returns its path. */
  readonly createWorktree?: (input: { readonly projectRoot: string; readonly baseRef: string; readonly name: string }) => string
}

const encodeProjection = Schema.encodeSync(Schema.toCodecJson(OrchestrationV2ThreadProjection))
const decodeProjection = Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2ThreadProjection))

const id = <B>(make: (value: string) => B, prefix: string): B => make(`${prefix}:${randomUUID()}`)
const now = () => DateTime.nowUnsafe()

const isTerminal = (status: OrchestrationV2Run['status']): status is TerminalRunStatus | 'rolled_back' =>
  status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'interrupted' || status === 'rolled_back'
const isActive = (run: OrchestrationV2Run) =>
  run.status === 'preparing' || run.status === 'starting' || run.status === 'running' || run.status === 'waiting'

// Copied verbatim from T3 Code apps/server/src/orchestration-v2/Orchestrator.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): the text a woken parent receives.
const DELEGATED_RESULT_INLINE_BYTES = 16_000

function delegatedCompletionWakeDetail(taskIds: ReadonlyArray<string>, tasks: ReadonlyArray<OrchestrationV2Subagent>): string {
  let remainingBytes = DELEGATED_RESULT_INLINE_BYTES
  return taskIds
    .map((taskId) => {
      const task = tasks.find(candidate => candidate.id === taskId)
      const label = `Delegated task ${taskId}${task?.title == null ? '' : ` (${task.title})`}${task === undefined ? ' reached a terminal state' : ` [${task.status}]`}`
      if (task?.result != null) {
        const detail = `${label}:\n${task.result}`
        const bytes = Buffer.byteLength(detail)
        if (bytes <= remainingBytes) {
          remainingBytes -= bytes
          return detail
        }
      }
      return `${label}. Use task_status with taskId ${taskId} to read the result.`
    })
    .join('\n\n')
}

const emptyProjection = (thread: OrchestrationV2AppThread): MutableProjection => ({
  thread,
  runs: [],
  attempts: [],
  nodes: [],
  subagents: [],
  providerSessions: [],
  providerThreads: [],
  providerTurns: [],
  runtimeRequests: [],
  messages: [],
  plans: [],
  turnItems: [],
  checkpointScopes: [],
  checkpoints: [],
  contextHandoffs: [],
  contextTransfers: [],
  visibleTurnItems: [],
  updatedAt: thread.updatedAt,
})

function upsert<T extends { readonly id: string }>(list: T[], value: T): void {
  const index = list.findIndex(entry => entry.id === value.id)
  if (index < 0) list.push(value)
  else list[index] = value
}

/**
 * As T3's ProjectionStore.threadShellFromProjection: the newest pending
 * approval, else the newest pending question; questions answered by message
 * do not block the run.
 */
function pendingRuntimeRequestSummary(
  requests: ReadonlyArray<OrchestrationV2RuntimeRequest>,
): OrchestrationV2PendingRuntimeRequestSummary | null {
  const request = requests
    .filter(candidate => candidate.status === 'pending')
    .toSorted(
      (left, right) =>
        Number(left.kind === 'user_input') - Number(right.kind === 'user_input') ||
        DateTime.toEpochMillis(right.createdAt) - DateTime.toEpochMillis(left.createdAt),
    )[0]
  if (request === undefined) return null
  return { id: request.id, kind: request.kind, createdAt: request.createdAt, blocking: request.responseCapability.type !== 'message' }
}

// As T3's Orchestrator: answers each question with text or a non-empty list of choices.
const isMessageQuestionAnswer = (answer: unknown): boolean =>
  (typeof answer === 'string' && answer.trim() !== '') ||
  (Array.isArray(answer) && answer.length > 0 && answer.every(entry => typeof entry === 'string' && entry.trim() !== ''))

export class DshOrchestratorEngine {
  private readonly threads = new Map<string, MutableProjection>()
  private readonly receipts = new Map<string, string>()
  private readonly commandEvents = new Map<string, OrchestrationV2StoredEvent[]>()
  private readonly stored: OrchestrationV2StoredEvent[] = []
  private readonly listeners = new Set<(event: OrchestrationV2StoredEvent) => void>()
  private sequence = 0
  private readonly dirty = new Set<string>()
  /** Prompt each queued run starts with. */
  private readonly prompts = new Map<string, string>()

  constructor(private readonly options: EngineOptions) {
    const loaded = options.backend.load()
    for (const encoded of loaded.projections) {
      const projection = decodeProjection(encoded) as unknown as MutableProjection
      this.threads.set(projection.thread.id, projection)
    }
    for (const [commandId, threadId] of loaded.receipts) this.receipts.set(commandId, threadId)
    this.recoverAfterRestart()
  }

  // ---- event plumbing ----

  private emit(
    commandId: CommandId | null,
    event: Omit<OrchestrationV2DomainEvent, 'eventId' | 'sequence' | 'commandId'> & {
      readonly type: OrchestrationV2DomainEvent['type']
    },
  ): OrchestrationV2StoredEvent {
    const full = { ...event, eventId: id(EventId.make, 'event'), commandId } as unknown as OrchestrationV2DomainEvent
    this.apply(full)
    this.sequence += 1
    const stored = { sequence: this.sequence, commandId, event: full } as OrchestrationV2StoredEvent
    this.stored.push(stored)
    if (this.stored.length > 5_000) this.stored.splice(0, this.stored.length - 5_000)
    for (const listener of this.listeners) listener(stored)
    return stored
  }

  /** The projector: snapshot events upsert their record. */
  private apply(event: OrchestrationV2DomainEvent): void {
    if (event.type === 'thread.created') {
      const existing = this.threads.get(event.payload.id)
      if (existing) existing.thread = event.payload
      else this.threads.set(event.payload.id, emptyProjection(event.payload))
      this.dirty.add(event.payload.id)
      return
    }
    const projection = this.threads.get(event.threadId)
    if (!projection) return
    const payload = (event as { readonly payload: unknown }).payload
    switch (event.type) {
      case 'thread.metadata-updated':
        projection.thread = payload as OrchestrationV2AppThread
        break
      case 'run.created':
      case 'run.updated':
        upsert(projection.runs, payload as OrchestrationV2Run)
        break
      case 'run-attempt.created':
      case 'run-attempt.updated':
        upsert(projection.attempts, payload as OrchestrationV2RunAttempt)
        break
      case 'node.updated':
        upsert(projection.nodes, payload as OrchestrationV2ExecutionNode)
        break
      case 'subagent.updated':
        upsert(projection.subagents, payload as OrchestrationV2Subagent)
        break
      case 'provider-thread.updated':
        upsert(projection.providerThreads, payload as OrchestrationV2ProviderThread)
        break
      case 'provider-turn.updated':
        upsert(projection.providerTurns, payload as OrchestrationV2ProviderTurn)
        break
      case 'message.updated':
        upsert(projection.messages, payload as OrchestrationV2ConversationMessage)
        break
      case 'turn-item.updated': {
        const item = payload as OrchestrationV2TurnItem
        upsert(projection.turnItems, item)
        if (!projection.visibleTurnItems.some(row => row.sourceItemId === item.id)) {
          projection.visibleTurnItems.push({
            position: projection.visibleTurnItems.length,
            visibility: 'local',
            sourceThreadId: projection.thread.id,
            sourceItemId: item.id,
            item,
          } as OrchestrationV2ProjectedTurnItem)
        } else {
          projection.visibleTurnItems = projection.visibleTurnItems.map(row =>
            row.sourceItemId === item.id ? { ...row, item } : row,
          )
        }
        break
      }
      case 'context-transfer.created':
      case 'context-transfer.updated':
        upsert(projection.contextTransfers, payload as OrchestrationV2ContextTransfer)
        break
      case 'runtime-request.updated':
        upsert(projection.runtimeRequests, payload as OrchestrationV2RuntimeRequest)
        break
      default:
        break
    }
    projection.updatedAt = event.occurredAt
    projection.thread = { ...projection.thread, updatedAt: event.occurredAt }
    this.dirty.add(event.threadId)
  }

  /** Persist every projection touched since the last flush. */
  flush(): void {
    for (const threadId of this.dirty) {
      const projection = this.threads.get(threadId)
      if (projection) this.options.backend.saveProjection(threadId, encodeProjection(projection as unknown as Projection))
    }
    this.dirty.clear()
  }

  onStoredEvent(listener: (event: OrchestrationV2StoredEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  storedEventsAfter(threadId: ThreadId | undefined, afterSequence: number): OrchestrationV2StoredEvent[] {
    return this.stored.filter(
      stored => stored.sequence > afterSequence && (threadId === undefined || stored.event.threadId === threadId),
    )
  }

  get currentSequence(): number {
    return this.sequence
  }

  /** Runs a previous Host process left active can never finish; end them as interrupted. */
  private recoverAfterRestart(): void {
    for (const projection of this.threads.values()) {
      for (const run of projection.runs) {
        if (isActive(run) || run.status === 'queued') {
          this.endRun(projection.thread.id, run.id, run.status === 'queued' ? 'cancelled' : 'interrupted', null, null)
        }
      }
    }
    this.flush()
  }

  // ---- reads ----

  projection(threadId: ThreadId): MutableProjection {
    const projection = this.threads.get(threadId)
    if (!projection) throw new OrchestratorProjectionError({ threadId, cause: 'thread not found' })
    return projection
  }

  hasThread(threadId: string): boolean {
    return this.threads.has(threadId)
  }

  threadIds(): ThreadId[] {
    return [...this.threads.keys()] as ThreadId[]
  }

  getThreadRecords<K extends ProjectionRecordField>(
    threadId: ThreadId,
    fields: ReadonlyArray<K>,
    filter?: ProjectionRecordFilter,
  ): ProjectionRecords<K> {
    const projection = this.projection(threadId)
    const result: Record<string, unknown> = { thread: projection.thread }
    for (const field of fields) result[field] = this.filtered(projection, field, filter)
    return result as ProjectionRecords<K>
  }

  /** The filters the lifted code uses; others return the whole field. */
  private filtered(
    projection: MutableProjection,
    field: ProjectionRecordField,
    filter: ProjectionRecordFilter | undefined,
  ): unknown {
    const list = projection[field] as ReadonlyArray<Record<string, unknown>>
    if (!filter) return list
    switch (field) {
      case 'runs':
        return (list as unknown as OrchestrationV2Run[]).filter(
          run =>
            (filter.runIds === undefined || filter.runIds.includes(run.id)) &&
            (filter.runStatuses === undefined || filter.runStatuses.includes(run.status)),
        )
      case 'messages':
        return (list as unknown as OrchestrationV2ConversationMessage[]).filter(
          message =>
            (filter.messageRoles === undefined || filter.messageRoles.includes(message.role)) &&
            (filter.messageIds === undefined || filter.messageIds.includes(message.id)) &&
            (filter.messageRunIds === undefined || (message.runId !== null && filter.messageRunIds.includes(message.runId))) &&
            true,
        )
      case 'turnItems':
        return (list as unknown as OrchestrationV2TurnItem[]).filter(
          item =>
            (filter.turnItemTypes === undefined || filter.turnItemTypes.length === 0
              ? filter.turnItemTypes === undefined
              : filter.turnItemTypes.includes(item.type)) &&
            (filter.turnItemRunIds === undefined || filter.turnItemRunIds.includes(item.runId)) &&
            (filter.turnItemStatuses === undefined || filter.turnItemStatuses.includes(item.status)),
        )
      case 'subagents':
        return (list as unknown as OrchestrationV2Subagent[]).filter(
          task =>
            (filter.subagentIds === undefined || filter.subagentIds.includes(task.id)) &&
            (filter.subagentRunIds === undefined || (task.runId !== null && filter.subagentRunIds.includes(task.runId))),
        )
      case 'providerThreads':
        return filter.providerThreadIds === undefined
          ? list
          : list.filter(entry => filter.providerThreadIds?.includes(entry.id as never))
      case 'providerTurns':
        return filter.providerTurnAttemptIds === undefined
          ? list
          : (list as unknown as OrchestrationV2ProviderTurn[]).filter(
            turn => turn.runAttemptId !== null && filter.providerTurnAttemptIds?.includes(turn.runAttemptId),
          )
      case 'nodes':
        return filter.nodeIds === undefined ? list : list.filter(node => filter.nodeIds?.includes(node.id as never))
      default:
        return list
    }
  }

  shell(threadId: ThreadId): OrchestrationV2ThreadShell | null {
    const projection = this.threads.get(threadId)
    return projection ? this.toShell(projection) : null
  }

  private toShell(projection: MutableProjection): OrchestrationV2ThreadShell {
    const { thread } = projection
    const runs = projection.runs.toSorted((a, b) => a.ordinal - b.ordinal)
    const latest = runs.at(-1)
    const active = runs.filter(isActive).at(-1)
    const visibleMessages = projection.messages.filter(message => message.role !== 'system')
    const latestVisible = visibleMessages.at(-1)
    const latestUser = projection.messages.filter(message => message.role === 'user').at(-1)
    return {
      createdBy: thread.createdBy,
      creationSource: thread.creationSource,
      id: thread.id,
      projectId: thread.projectId,
      title: thread.title,
      providerInstanceId: thread.providerInstanceId,
      modelSelection: thread.modelSelection,
      runtimeMode: thread.runtimeMode,
      interactionMode: thread.interactionMode,
      branch: thread.branch,
      worktreePath: thread.worktreePath,
      lineage: thread.lineage,
      forkedFrom: thread.forkedFrom,
      activeProviderThreadId: thread.activeProviderThreadId,
      latestRunId: latest?.id ?? null,
      latestRunRequestedAt: latest?.requestedAt ?? null,
      latestRunStartedAt: latest?.startedAt ?? null,
      latestRunCompletedAt: latest?.completedAt ?? null,
      activeRunId: active?.id ?? null,
      activityRunStartedAt: active?.startedAt ?? null,
      activityRunStatus: active === undefined ? null : (active.status as 'preparing' | 'starting' | 'running' | 'waiting'),
      status:
        active?.status ??
        runs.findLast(run => run.status === 'queued' && run.queueHeld !== true)?.status ??
        latest?.status ??
        'idle',
      pendingRuntimeRequest: pendingRuntimeRequestSummary(projection.runtimeRequests),
      latestVisibleMessage:
        latestVisible === undefined
          ? null
          : { id: latestVisible.id, role: latestVisible.role, text: latestVisible.text, updatedAt: latestVisible.updatedAt },
      latestUserMessageAt: latestUser?.createdAt ?? null,
      hasActionableProposedPlan: false,
      pendingBackgroundTasks: derivePendingBackgroundWork({
        latestRun: latest ?? null,
        providerThreads: projection.providerThreads,
        turnItems: projection.turnItems,
        activeProviderThreadId: thread.activeProviderThreadId,
        runs,
      }),
      providerInstanceHistory: [],
      itemCount: projection.turnItems.length,
      visibleItemCount: projection.visibleTurnItems.length,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      archivedAt: thread.archivedAt,
      settledOverride: thread.settledOverride,
      settledAt: thread.settledAt,
      deletedAt: thread.deletedAt,
    }
  }

  /** T3's `blockedOnThreadWait`: the active run is only waiting on t3_thread_wait or a blocking delegation. */
  blockedOnThreadWait(threadId: ThreadId): boolean {
    const projection = this.threads.get(threadId)
    if (!projection) return false
    const activeRun = projection.runs.filter(isActive).at(-1) ?? null
    return deriveBlockedOnThreadWait({ activeRun, turnItems: projection.turnItems })
  }

  shellSnapshot(options: ShellSnapshotOptions = {}): {
    schemaVersion: number
    snapshotSequence: number
    threads: OrchestrationV2ThreadShell[]
    archivedThreads: OrchestrationV2ThreadShell[]
  } {
    const shells = [...this.threads.values()]
      .filter(projection => projection.thread.deletedAt === null)
      .filter(projection => options.projectId === undefined || projection.thread.projectId === options.projectId)
      .filter(projection => options.threadIds === undefined || options.threadIds.includes(projection.thread.id))
      .map(projection => this.toShell(projection))
    return {
      schemaVersion: 1,
      snapshotSequence: this.sequence,
      threads: shells.filter(shell => shell.archivedAt === null),
      archivedThreads: shells.filter(shell => shell.archivedAt !== null),
    }
  }

  /** As T3's ProjectionStore.getTimelinePage: positions over every visible item; `messages` keeps messages and plans. */
  timelinePage(threadId: ThreadId, options: ProjectionTimelinePageOptions): ProjectionTimelinePage {
    const visible = this.projection(threadId).visibleTurnItems
    const matching = visible
      .map((row, position) => ({ ...row, position }))
      .filter(row =>
        options.itemId === undefined
          ? row.position > (options.afterPosition ?? -1) &&
            (options.view === 'activity' || ['user_message', 'assistant_message', 'proposed_plan'].includes(row.item.type))
          : row.sourceItemId === options.itemId,
      )
    const page = matching.slice(0, options.limit)
    return { items: page, totalItems: visible.length, hasMore: matching.length > page.length }
  }

  appOwnedChildThreadIds(threadId: ThreadId): ThreadId[] {
    return [
      ...new Set(
        this.projection(threadId).subagents.flatMap(task =>
          task.origin === 'app_owned' && task.childThreadId !== null ? [task.childThreadId] : [],
        ),
      ),
    ]
  }

  /** As T3's Orchestrator.delegatedTaskResultPending, without restart continuations (dsh has none). */
  delegatedTaskResultPending(childThreadId: ThreadId, taskId?: NodeId): boolean {
    const child = this.projection(childThreadId)
    if (taskId !== undefined) {
      const run = child.runs
        .filter(candidate => candidate.delegatedTaskId === taskId)
        .toSorted((a, b) => b.ordinal - a.ordinal)[0]
      return run === undefined || !isTerminal(run.status)
    }
    const progress = delegatedTaskProgress(child)
    return progress.state !== 'result_available'
  }

  hasReceipt(commandId: CommandId): boolean {
    return this.receipts.has(commandId)
  }

  // ---- commands ----

  /** Apply one command; returns the events it stored. Replays of an accepted command store nothing. */
  dispatch(command: OrchestrationV2ServerCommand): {
    readonly sequence: number
    readonly storedEvents: OrchestrationV2StoredEvent[]
    readonly replayed?: true
  } {
    // As T3: a replay returns the original command's events.
    if (this.receipts.has(command.commandId)) {
      return { sequence: this.sequence, storedEvents: this.commandEvents.get(command.commandId) ?? [], replayed: true }
    }
    const before = this.sequence
    const fail = (cause: string): never => {
      throw new OrchestratorDispatchError({ commandId: command.commandId, commandType: command.type, cause })
    }
    switch (command.type) {
      case 'thread.create':
        this.threadCreate(command)
        break
      case 'message.dispatch':
        this.messageDispatch(command, fail)
        break
      case 'delegated_task.request':
        this.delegatedTaskRequest(command, fail)
        break
      case 'thread.stop':
        this.threadStop(command)
        break
      case 'run.interrupt':
        this.runInterrupt(command, fail)
        break
      case 'queued-run.cancel':
        this.queuedRunCancel(command, fail)
        break
      case 'delegated_task.wake-policy':
        this.updateTask(
          command.parentThreadId,
          command.taskId,
          command.commandId,
          task => ({ ...task, completionWake: command.completionWake }),
          fail,
        )
        break
      case 'delegated_task.completion-delivery.acknowledge':
        this.updateTask(
          command.parentThreadId,
          command.taskId,
          command.commandId,
          task =>
            task.completionDelivery?.state === 'disposed'
              ? task
              : { ...task, completionDelivery: { state: 'acknowledged', observedByRunId: command.observedByRunId ?? null } },
          fail,
        )
        break
      case 'delegated_task.completion-delivery.dispose':
        this.updateTask(
          command.parentThreadId,
          command.taskId,
          command.commandId,
          task => ({
            ...task,
            completionDelivery: { state: 'disposed', observedByRunId: task.completionDelivery?.observedByRunId ?? null },
          }),
          fail,
        )
        break
      case 'thread.created.record':
        this.threadCreatedRecord(command)
        break
      case 'runtime-request.respond':
        this.runtimeRequestRespond(command, fail)
        break
      case 'thread.user-input.dismiss':
        this.userInputDismiss(command, fail)
        break
      case 'subagent.stop':
        this.updateTask(
          command.threadId,
          command.subagentId,
          command.commandId,
          task => (task.result !== null ? task : { ...task, status: 'cancelled', completedAt: now(), updatedAt: now() }),
          fail,
        )
        break
      default:
        fail(`Command ${command.type} is not available in dsh.`)
    }
    const threadId = 'threadId' in command ? command.threadId : 'parentThreadId' in command ? command.parentThreadId : undefined
    this.receipts.set(command.commandId, String(threadId ?? ''))
    this.options.backend.saveReceipt(command.commandId, String(threadId ?? ''))
    this.settle()
    this.flush()
    const storedEvents = this.stored.filter(stored => stored.sequence > before)
    this.commandEvents.set(command.commandId, storedEvents)
    if (this.commandEvents.size > 2_000) this.commandEvents.delete(this.commandEvents.keys().next().value as string)
    return { sequence: this.sequence, storedEvents }
  }

  private threadCreate(command: Extract<OrchestrationV2ServerCommand, { readonly type: 'thread.create' }>): void {
    const at = now()
    const thread: OrchestrationV2AppThread = {
      createdBy: command.createdBy ?? 'agent',
      creationSource: command.creationSource ?? 'mcp',
      id: command.threadId,
      projectId: command.projectId,
      title: command.title,
      providerInstanceId: command.modelSelection.instanceId,
      modelSelection: command.modelSelection,
      runtimeMode: command.runtimeMode,
      interactionMode: command.interactionMode,
      branch: command.branch ?? null,
      worktreePath: command.worktreePath ?? null,
      activeProviderThreadId: null,
      lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: command.threadId },
      forkedFrom: null,
      createdAt: at,
      updatedAt: at,
      archivedAt: null,
      settledOverride: null,
      settledAt: null,
      lastVisitedAt: null,
      deletedAt: null,
    }
    this.emit(command.commandId, {
      type: 'thread.created',
      threadId: thread.id,
      providerInstanceId: thread.providerInstanceId,
      driver: this.options.driverKindOf(thread.providerInstanceId),
      occurredAt: at,
      payload: thread,
    } as never)
  }

  /** Replaces a known thread's record, as T3's `thread.metadata-updated` does (a provider-side rename). */
  updateThreadMetadata(thread: OrchestrationV2AppThread): void {
    if (!this.threads.has(thread.id)) return
    this.emit(null, {
      type: 'thread.metadata-updated',
      threadId: thread.id,
      providerInstanceId: thread.providerInstanceId,
      occurredAt: now(),
      payload: thread,
    } as never)
    this.flush()
  }

  /** Records a thread a provider session already owns (a dsh Session that called a tool). */
  registerThread(thread: OrchestrationV2AppThread): void {
    if (this.threads.has(thread.id)) return
    this.emit(null, {
      type: 'thread.created',
      threadId: thread.id,
      providerInstanceId: thread.providerInstanceId,
      driver: this.options.driverKindOf(thread.providerInstanceId),
      occurredAt: thread.createdAt,
      payload: thread,
    } as never)
    this.flush()
  }

  /** Persist a main Session's selected provider before starting its next run. */
  selectSessionProvider(threadId: ThreadId, providerInstanceId: ProviderInstanceId, model: string): void {
    const projection = this.projection(threadId)
    if (projection.thread.providerInstanceId === providerInstanceId) return
    if (projection.runs.some(run => isActive(run) || run.status === 'queued')) {
      throw new Error('Wait for the current orchestrator run to finish before switching providers.')
    }
    const at = now()
    this.emit(null, { type: 'thread.created', threadId, providerInstanceId,
      driver: this.options.driverKindOf(providerInstanceId), occurredAt: at,
      payload: { ...projection.thread, providerInstanceId, modelSelection: { instanceId: providerInstanceId, model },
        activeProviderThreadId: null, updatedAt: at },
    } as never)
    this.flush()
  }

  /** Mark an accepted run fresh before its native backend receives a full context handoff. */
  prepareRunHandoff(threadId: ThreadId, runId: RunId): OrchestrationV2Run {
    const run = this.projection(threadId).runs.find(candidate => candidate.id === runId)
    if (!run || isTerminal(run.status)) throw new Error('The handoff run is no longer active.')
    const prepared = { ...run, freshContext: true }
    this.emit(null, { type: 'run.updated', threadId, providerInstanceId: run.providerInstanceId,
      driver: this.options.driverKindOf(run.providerInstanceId), occurredAt: now(), payload: prepared,
    } as never)
    this.flush()
    return prepared
  }

  private messageDispatch(command: MessageDispatch, fail: (cause: string) => never): void {
    const projection = this.projection(command.threadId)
    const mode = command.dispatchMode
    const at = now()
    if (mode.type === 'steer_active' || mode.type === 'restart_active') {
      const target = projection.runs.find(run => run.id === mode.targetRunId)
      if (!target || !isActive(target)) fail(`Run ${mode.targetRunId} is not active.`)
      const driver = this.options.driverFor(projection.thread.providerInstanceId)
      if (mode.type === 'steer_active') {
        if (!driver?.canSteer || !driver.steer(command.threadId, target as OrchestrationV2Run, command.text))
          fail('This provider cannot take mid-turn input.')
        this.recordUserMessage(command, target as OrchestrationV2Run, 'steer', at)
        return
      }
      // restart_active: interrupt the turn, then run the message as its continuation.
      driver?.interrupt(command.threadId, mode.targetRunId, 'interrupted')
      this.createRun(command, at, { restartContinuationOfRunId: mode.targetRunId, front: true })
      return
    }
    this.createRun(command, at, { queueOnly: mode.type === 'queue_after_active' })
  }

  private recordUserMessage(
    command: MessageDispatch,
    run: OrchestrationV2Run,
    intent: 'turn_start' | 'queued_turn' | 'steer',
    at: DateTime.Utc,
  ): void {
    const message: OrchestrationV2ConversationMessage = {
      createdBy: command.createdBy ?? 'agent',
      creationSource: command.creationSource ?? 'mcp',
      ...(command.senderThreadId === undefined ? {} : { senderThreadId: command.senderThreadId }),
      ...(command.delegatedCompletion === undefined ? {} : { delegatedCompletion: command.delegatedCompletion }),
      ...(command.notification === undefined ? {} : { notification: command.notification }),
      id: command.messageId,
      threadId: command.threadId,
      runId: run.id,
      nodeId: run.rootNodeId,
      role: 'user',
      text: command.text,
      attachments: [],
      streaming: false,
      createdAt: at,
      updatedAt: at,
    }
    this.emit(command.commandId, {
      type: 'message.updated',
      threadId: command.threadId,
      runId: run.id,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: message,
    } as never)
    const item = {
      id: id(TurnItemId.make, 'turn-item'),
      threadId: command.threadId,
      runId: run.id,
      nodeId: run.rootNodeId,
      providerThreadId: run.providerThreadId,
      providerTurnId: null,
      nativeItemRef: null,
      parentItemId: null,
      ordinal: this.nextOrdinal(command.threadId),
      status: 'completed',
      title: null,
      startedAt: at,
      completedAt: at,
      updatedAt: at,
      createdBy: message.createdBy,
      creationSource: message.creationSource,
      type: 'user_message',
      messageId: message.id,
      ...(command.senderThreadId === undefined ? {} : { senderThreadId: command.senderThreadId }),
      ...(command.freshContext ? { freshContext: true } : {}),
      inputIntent: intent,
      text: command.text,
      attachments: [],
    } as OrchestrationV2TurnItem
    this.emit(command.commandId, {
      type: 'turn-item.updated',
      threadId: command.threadId,
      runId: run.id,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: item,
    } as never)
  }

  private nextOrdinal(threadId: ThreadId): number {
    return this.projection(threadId).turnItems.reduce((max, item) => Math.max(max, item.ordinal + 1), 0)
  }

  /** A new run for a dispatched message, queued behind active work or started now. */
  private createRun(
    command: MessageDispatch,
    at: DateTime.Utc,
    options: {
      queueOnly?: boolean
      front?: boolean
      restartContinuationOfRunId?: RunId
      delegatedTaskId?: NodeId
      external?: boolean
    },
  ): OrchestrationV2Run {
    const projection = this.projection(command.threadId)
    const runId = id(RunId.make, 'run')
    const rootNodeId = id(NodeId.make, 'node')
    const modelSelection: ModelSelection = command.modelSelection ?? projection.thread.modelSelection
    const ordinal = projection.runs.reduce((max, run) => Math.max(max, run.ordinal), 0) + 1
    const followupTask = options.delegatedTaskId ?? this.followupTaskFor(command, runId)
    const run: OrchestrationV2Run = {
      id: runId,
      threadId: command.threadId,
      ordinal,
      providerInstanceId: modelSelection.instanceId,
      modelSelection,
      providerThreadId: null,
      userMessageId: command.messageId,
      rootNodeId,
      activeAttemptId: null,
      status: 'queued',
      requestedAt: at,
      startedAt: null,
      completedAt: null,
      checkpointId: null,
      contextHandoffId: null,
      ...(options.restartContinuationOfRunId === undefined
        ? {}
        : { restartContinuationOfRunId: options.restartContinuationOfRunId }),
      ...(followupTask === undefined ? {} : { delegatedTaskId: followupTask }),
      ...(command.freshContext ? { freshContext: true } : {}),
    }
    const node: OrchestrationV2ExecutionNode = {
      id: rootNodeId,
      threadId: command.threadId,
      runId,
      parentNodeId: null,
      rootNodeId,
      kind: 'root_turn',
      status: 'pending',
      countsForRun: true,
      providerThreadId: null,
      providerTurnId: null,
      nativeItemRef: null,
      runtimeRequestId: null,
      checkpointScopeId: null,
      startedAt: null,
      completedAt: null,
    }
    this.emit(command.commandId, {
      type: 'run.created',
      threadId: command.threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: run,
    } as never)
    this.emit(command.commandId, {
      type: 'node.updated',
      threadId: command.threadId,
      runId,
      nodeId: rootNodeId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: node,
    } as never)
    const busy = projection.runs.some(
      candidate =>
        candidate.id !== runId &&
        (isActive(candidate) || (candidate.status === 'queued' && candidate.queueHeld !== true && !options.front)),
    )
    this.recordUserMessage(command, run, busy || (options.queueOnly === true && busy) ? 'queued_turn' : 'turn_start', at)
    this.prompts.set(runId, command.text)
    if (!options.external) this.startNext(command.threadId, options.front ? runId : undefined)
    return this.projection(command.threadId).runs.find(candidate => candidate.id === runId) ?? run
  }

  /**
   * As T3's Orchestrator.recordSubagentFollowup: a message from the parent to a
   * finished child starts a fresh task in the child thread for that parent.
   */
  private followupTaskFor(command: MessageDispatch, runId: RunId): NodeId | undefined {
    const child = this.projection(command.threadId)
    const parentThreadId = child.thread.lineage.parentThreadId
    if (child.thread.lineage.relationshipToParent !== 'subagent' || parentThreadId === null) return undefined
    if (command.delegatedCompletion !== undefined) return undefined
    if (command.createdBy !== 'user' && command.senderThreadId !== parentThreadId) return undefined
    const parent = this.threads.get(parentThreadId)
    if (!parent) return undefined
    const originalId = child.thread.forkedFrom?.type === 'node' ? child.thread.forkedFrom.nodeId : undefined
    const original = parent.subagents.find(
      task => task.origin === 'app_owned' && task.childThreadId === child.thread.id && task.id === originalId,
    )
    if (original === undefined || original.result === null) return undefined
    if (child.runs.some(isActive)) return undefined
    const owner =
      parent.runs.filter(isActive).toSorted((a, b) => b.ordinal - a.ordinal)[0] ??
      parent.runs.toSorted((a, b) => b.ordinal - a.ordinal)[0]
    const at = now()
    const taskId = id(NodeId.make, 'node')
    const task: OrchestrationV2Subagent = {
      ...original,
      id: taskId,
      runId: owner?.id ?? null,
      prompt: command.text,
      status: 'running',
      result: null,
      startedAt: at,
      completedAt: null,
      updatedAt: at,
      completionWake: 'always',
      completionDelivery: undefined,
    }
    void runId
    this.emit(command.commandId, {
      type: 'subagent.updated',
      threadId: parentThreadId,
      ...(owner ? { runId: owner.id } : {}),
      nodeId: taskId,
      providerInstanceId: task.providerInstanceId,
      occurredAt: at,
      payload: task,
    } as never)
    return taskId
  }

  /** Start the thread's next queued run when nothing is active. `first` jumps the queue. */
  private startNext(threadId: ThreadId, first?: RunId): void {
    const projection = this.projection(threadId)
    if (projection.runs.some(isActive)) return
    const queued = projection.runs
      .filter(run => run.status === 'queued' && run.queueHeld !== true)
      .toSorted((a, b) => a.ordinal - b.ordinal)
    const next = (first === undefined ? undefined : queued.find(run => run.id === first)) ?? queued[0]
    if (!next) return
    const driver = this.options.driverFor(next.providerInstanceId)
    const at = now()
    if (!driver) {
      this.endRun(threadId, next.id, 'failed', `No provider runs instance ${next.providerInstanceId} in this dsh Host.`, null)
      return
    }
    const starting = { ...next, status: 'starting' as const }
    this.emit(null, {
      type: 'run.updated',
      threadId,
      runId: next.id,
      providerInstanceId: next.providerInstanceId,
      occurredAt: at,
      payload: starting,
    } as never)
    driver.startRun(
      threadId,
      starting,
      this.prompts.get(next.id) ?? projection.messages.find(message => message.id === next.userMessageId)?.text ?? '',
    )
  }

  private delegatedTaskRequest(
    command: Extract<OrchestrationV2ServerCommand, { readonly type: 'delegated_task.request' }>,
    fail: (cause: string) => never,
  ): void {
    // Follows T3 Orchestrator.dispatchDelegatedTaskRequest.
    const parent = this.projection(command.parentThreadId)
    const parentRun = parent.runs.find(run => run.id === command.parentRunId)
    if (parentRun === undefined || !isActive(parentRun)) fail(`Parent run ${command.parentRunId} is not active.`)
    const run = parentRun as OrchestrationV2Run
    if (run.rootNodeId === null) fail(`Parent node ${command.parentNodeId} is not part of active run ${run.id}.`)
    const at = now()
    const driver = this.options.driverKindOf(command.modelSelection.instanceId)
    const taskNodeId = id(NodeId.make, 'node')
    const childThreadId = ThreadId.make(`thread-${randomUUID()}`)
    const childMessageId = id(MessageId.make, 'message')
    const taskTurnItemId = id(TurnItemId.make, 'turn-item')
    const taskTitle = subagentThreadTitle({
      parentTitle: parent.thread.title,
      prompt: command.task,
      ...(command.title === undefined ? {} : { title: command.title }),
      ordinal: parent.subagents.filter(task => task.origin === 'app_owned').length + 1,
    })
    const childThread: OrchestrationV2AppThread = {
      ...makeSubagentChildThread({
        parentThread: parent.thread,
        childThreadId,
        parentNodeId: taskNodeId,
        activeProviderThreadId: null,
        providerInstanceId: command.modelSelection.instanceId,
        modelSelection: command.modelSelection,
        title: taskTitle,
        now: at,
        createdBy: command.createdBy,
        creationSource: command.creationSource,
      }),
      runtimeMode: command.runtimeMode,
      interactionMode: command.interactionMode,
      ...(command.workspaceStrategy === undefined ? {} : { branch: null, worktreePath: null }),
    }
    if (command.workspaceStrategy?.type === 'worktree') {
      if (!this.options.createWorktree) fail('This dsh Host cannot create worktrees.')
      const projectRoot = parent.thread.worktreePath ?? String(parent.thread.projectId)
      const path = (this.options.createWorktree as NonNullable<EngineOptions['createWorktree']>)({
        projectRoot,
        baseRef: command.workspaceStrategy.baseRef,
        name: String(childThreadId),
      })
      ;(childThread as { worktreePath: string | null }).worktreePath = path as never
    }
    const task: OrchestrationV2Subagent = {
      id: taskNodeId,
      threadId: command.parentThreadId,
      runId: run.id,
      parentNodeId: command.parentNodeId,
      origin: 'app_owned',
      createdBy: command.createdBy,
      driver,
      providerInstanceId: command.modelSelection.instanceId,
      providerThreadId: null,
      childThreadId,
      nativeTaskRef: null,
      prompt: command.task,
      title: command.title ?? null,
      model: command.modelSelection.model,
      ...(command.completionWake === undefined ? {} : { completionWake: command.completionWake }),
      status: 'running',
      result: null,
      startedAt: at,
      completedAt: null,
      updatedAt: at,
    }
    const taskNode: OrchestrationV2ExecutionNode = {
      id: taskNodeId,
      threadId: command.parentThreadId,
      runId: run.id,
      parentNodeId: command.parentNodeId,
      rootNodeId: run.rootNodeId as NodeId,
      kind: 'subagent',
      status: 'running',
      countsForRun: false,
      providerThreadId: null,
      providerTurnId: null,
      nativeItemRef: null,
      runtimeRequestId: null,
      checkpointScopeId: null,
      startedAt: at,
      completedAt: null,
    }
    const taskTurnItem = {
      id: taskTurnItemId,
      threadId: command.parentThreadId,
      runId: run.id,
      nodeId: taskNodeId,
      providerThreadId: run.providerThreadId,
      providerTurnId: null,
      nativeItemRef: null,
      parentItemId: null,
      ordinal: this.nextOrdinal(command.parentThreadId),
      status: 'running',
      title: command.title ?? taskTitle,
      startedAt: at,
      completedAt: null,
      updatedAt: at,
      type: 'subagent',
      subagentId: taskNodeId,
      origin: 'app_owned',
      driver,
      providerInstanceId: command.modelSelection.instanceId,
      childThreadId,
      prompt: command.task,
      result: null,
    } as OrchestrationV2TurnItem
    const base = { providerInstanceId: command.modelSelection.instanceId, driver, occurredAt: at }
    this.emit(command.commandId, { ...base, type: 'thread.created', threadId: childThreadId, payload: childThread } as never)
    this.emit(command.commandId, {
      ...base,
      type: 'node.updated',
      threadId: command.parentThreadId,
      runId: run.id,
      nodeId: taskNodeId,
      payload: taskNode,
    } as never)
    this.emit(command.commandId, {
      ...base,
      type: 'subagent.updated',
      threadId: command.parentThreadId,
      runId: run.id,
      nodeId: taskNodeId,
      payload: task,
    } as never)
    this.emit(command.commandId, {
      ...base,
      type: 'turn-item.updated',
      threadId: command.parentThreadId,
      runId: run.id,
      nodeId: taskNodeId,
      payload: taskTurnItem,
    } as never)
    const childCommand: MessageDispatch = {
      type: 'message.dispatch',
      createdBy: command.createdBy,
      creationSource: command.creationSource,
      commandId: command.commandId,
      threadId: childThreadId,
      senderThreadId: command.parentThreadId,
      messageId: childMessageId,
      text: command.task,
      attachments: [],
      modelSelection: command.modelSelection,
      dispatchMode: { type: 'start_immediately' },
    }
    const childRun = this.createRun(childCommand, at, { delegatedTaskId: taskNodeId })
    const spawnTransfer: OrchestrationV2ContextTransfer = {
      id: id(ContextTransferId.make, 'transfer'),
      type: 'subagent_spawn',
      sourceThreadId: command.parentThreadId,
      targetThreadId: childThreadId,
      sourcePoint: { threadId: command.parentThreadId, runId: run.id, turnItemId: taskTurnItemId },
      basePoint: null,
      sourceProviderInstanceId: run.providerInstanceId,
      targetProviderInstanceId: command.modelSelection.instanceId,
      targetRunId: childRun.id,
      status: 'consumed',
      resolution: null,
      createdBy: command.createdBy,
      error: null,
      createdAt: at,
      updatedAt: at,
      consumedAt: at,
    }
    this.emit(command.commandId, {
      ...base,
      type: 'context-transfer.created',
      threadId: childThreadId,
      runId: childRun.id,
      payload: spawnTransfer,
    } as never)
  }

  private threadStop(command: Extract<OrchestrationV2ServerCommand, { readonly type: 'thread.stop' }>): void {
    // As T3's Stop: interrupt the running turn and hold queued turns.
    const projection = this.projection(command.threadId)
    const at = now()
    for (const run of projection.runs) {
      if (run.status === 'queued' && run.queueHeld !== true) {
        this.emit(command.commandId, {
          type: 'run.updated',
          threadId: command.threadId,
          runId: run.id,
          providerInstanceId: run.providerInstanceId,
          occurredAt: at,
          payload: { ...run, queueHeld: true },
        } as never)
      }
    }
    const active = projection.runs.filter(isActive).at(-1)
    if (active) this.requestInterrupt(command.commandId, command.threadId, active, command.reason ?? 'Stopped', 'cancelled')
  }

  private runInterrupt(
    command: Extract<OrchestrationV2ServerCommand, { readonly type: 'run.interrupt' }>,
    fail: (cause: string) => never,
  ): void {
    const run = this.projection(command.threadId).runs.find(candidate => candidate.id === command.runId)
    if (!run) fail(`Run ${command.runId} was not found.`)
    if (isActive(run as OrchestrationV2Run))
      this.requestInterrupt(
        command.commandId,
        command.threadId,
        run as OrchestrationV2Run,
        command.reason ?? 'Interrupted',
        'interrupted',
      )
  }

  private requestInterrupt(
    commandId: CommandId,
    threadId: ThreadId,
    run: OrchestrationV2Run,
    message: string,
    intent: 'interrupted' | 'cancelled',
  ): void {
    const at = now()
    const providerTurn = this.projection(threadId)
      .providerTurns.filter(turn => turn.runAttemptId === run.activeAttemptId)
      .at(-1)
    const item = {
      id: id(TurnItemId.make, 'turn-item'),
      threadId,
      runId: run.id,
      nodeId: run.rootNodeId,
      providerThreadId: run.providerThreadId,
      providerTurnId: providerTurn?.id ?? null,
      nativeItemRef: null,
      parentItemId: null,
      ordinal: this.nextOrdinal(threadId),
      status: 'completed',
      title: null,
      startedAt: at,
      completedAt: at,
      updatedAt: at,
      type: 'run_interrupt_request',
      message,
    } as OrchestrationV2TurnItem
    this.emit(commandId, {
      type: 'turn-item.updated',
      threadId,
      runId: run.id,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: item,
    } as never)
    if (run.status === 'starting' && run.activeAttemptId === null) {
      // Nothing reached the provider yet.
      this.options.driverFor(run.providerInstanceId)?.interrupt(threadId, run.id, intent)
      return
    }
    this.options.driverFor(run.providerInstanceId)?.interrupt(threadId, run.id, intent)
  }

  private queuedRunCancel(
    command: Extract<OrchestrationV2ServerCommand, { readonly type: 'queued-run.cancel' }>,
    fail: (cause: string) => never,
  ): void {
    const run = this.projection(command.threadId).runs.find(candidate => candidate.id === command.runId)
    if (!run) fail(`Run ${command.runId} was not found.`)
    if ((run as OrchestrationV2Run).status === 'queued')
      this.endRun(command.threadId, command.runId, 'cancelled', null, command.commandId)
  }

  private updateTask(
    parentThreadId: ThreadId,
    taskId: NodeId,
    commandId: CommandId,
    update: (task: OrchestrationV2Subagent) => OrchestrationV2Subagent,
    fail: (cause: string) => never,
  ): void {
    const task = this.projection(parentThreadId).subagents.find(
      candidate => candidate.id === taskId && candidate.origin === 'app_owned',
    )
    if (!task) fail(`Delegated task ${taskId} is not an app-owned task of thread ${parentThreadId}.`)
    const next = update(task as OrchestrationV2Subagent)
    if (next === task) return
    this.emit(commandId, {
      type: 'subagent.updated',
      threadId: parentThreadId,
      ...(next.runId === null ? {} : { runId: next.runId }),
      nodeId: taskId,
      providerInstanceId: next.providerInstanceId,
      occurredAt: now(),
      payload: next,
    } as never)
  }

  private threadCreatedRecord(command: Extract<OrchestrationV2ServerCommand, { readonly type: 'thread.created.record' }>): void {
    const target = this.projection(command.targetThreadId)
    const at = now()
    const item = {
      id: id(TurnItemId.make, 'turn-item'),
      threadId: command.parentThreadId,
      runId: command.parentRunId,
      nodeId: command.parentNodeId,
      providerThreadId: null,
      providerTurnId: null,
      nativeItemRef: null,
      parentItemId: null,
      ordinal: this.nextOrdinal(command.parentThreadId),
      status: 'completed',
      title: target.thread.title,
      startedAt: at,
      completedAt: at,
      updatedAt: at,
      type: 'thread_created',
      targetThreadId: command.targetThreadId,
      targetRunId: command.targetRunId,
      targetProviderInstanceId: target.thread.providerInstanceId,
      targetModel: target.thread.modelSelection.model,
    } as OrchestrationV2TurnItem
    this.emit(command.commandId, {
      type: 'turn-item.updated',
      threadId: command.parentThreadId,
      runId: command.parentRunId,
      providerInstanceId: target.thread.providerInstanceId,
      occurredAt: at,
      payload: item,
    } as never)
  }

  // ---- runtime requests (approvals and questions) ----

  /**
   * A provider request waiting on the user, recorded as T3's adapters record
   * one (ClaudeAdapterV2.buildApprovalRequestArtifacts): a waiting
   * `approval_request`/`user_input_request` node under the run, the pending
   * request, and its waiting card.
   */
  openRuntimeRequest(
    threadId: ThreadId,
    runId: RunId,
    input: {
      readonly requestId: RuntimeRequestId
      readonly kind: OrchestrationV2RuntimeRequest['kind']
      readonly responseCapability: OrchestrationV2RuntimeRequest['responseCapability']
      readonly card: RuntimeRequestCard
    },
  ): boolean {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    if (!run || run.rootNodeId === null || isTerminal(run.status)) return false
    const at = now()
    const turn = projection.providerTurns.filter(candidate => candidate.runAttemptId === run.activeAttemptId).at(-1)
    const nodeId = NodeId.make(`node:request:${input.requestId}`)
    const node: OrchestrationV2ExecutionNode = {
      id: nodeId,
      threadId,
      runId,
      parentNodeId: run.rootNodeId,
      rootNodeId: run.rootNodeId,
      kind: input.card.type,
      status: 'waiting',
      countsForRun: false,
      providerThreadId: run.providerThreadId,
      providerTurnId: turn?.id ?? null,
      nativeItemRef: null,
      runtimeRequestId: input.requestId,
      checkpointScopeId: null,
      startedAt: at,
      completedAt: null,
    }
    const request: OrchestrationV2RuntimeRequest = {
      id: input.requestId,
      nodeId,
      providerTurnId: turn?.id ?? null,
      nativeRequestRef: null,
      kind: input.kind,
      status: 'pending',
      responseCapability: input.responseCapability,
      createdAt: at,
      resolvedAt: null,
    }
    const base = { threadId, runId, nodeId, providerInstanceId: run.providerInstanceId, occurredAt: at }
    this.emit(null, { ...base, type: 'node.updated', payload: node } as never)
    this.emit(null, { ...base, type: 'runtime-request.updated', payload: request } as never)
    this.emit(null, {
      ...base,
      type: 'turn-item.updated',
      payload: {
        ...this.itemBase(threadId, run, TurnItemId.make(`turn-item:request:${input.requestId}`), turn?.id ?? null, at),
        nodeId,
        status: 'waiting',
        ...input.card,
        requestId: input.requestId,
      },
    } as never)
    this.flush()
    return true
  }

  /** The runtime request with this id, if the thread has it. */
  runtimeRequest(threadId: ThreadId, requestId: RuntimeRequestId): OrchestrationV2RuntimeRequest | undefined {
    return this.threads.get(threadId)?.runtimeRequests.find(request => request.id === requestId)
  }

  /**
   * A pending request the provider can now take only as a message (a timed
   * question its run stopped waiting for): T3's `message` response capability.
   */
  continueRuntimeRequestByMessage(threadId: ThreadId, requestId: RuntimeRequestId): void {
    const projection = this.threads.get(threadId)
    const request = projection?.runtimeRequests.find(candidate => candidate.id === requestId)
    if (!projection || request?.status !== 'pending' || request.responseCapability.type === 'message') return
    const at = now()
    const node = projection.nodes.find(candidate => candidate.id === request.nodeId)
    const base = {
      threadId,
      ...(node?.runId == null ? {} : { runId: node.runId }),
      nodeId: request.nodeId,
      providerInstanceId: projection.thread.providerInstanceId,
      occurredAt: at,
    }
    this.emit(null, {
      ...base,
      type: 'runtime-request.updated',
      payload: { ...request, responseCapability: { type: 'message' } },
    } as never)
    const item = projection.turnItems.find(
      candidate => candidate.type === 'user_input_request' && candidate.requestId === requestId,
    )
    if (item) this.emit(null, { ...base, type: 'turn-item.updated', payload: { ...item, responseMode: 'message', updatedAt: at } } as never)
    this.flush()
  }

  /**
   * Settle a pending request as T3's Orchestrator.dispatchRuntimeRequestRespond
   * records it: the request resolves (or is cancelled or expires), its node
   * completes or is cancelled, and a question's card carries its answers.
   * Returns false when the request is no longer pending.
   */
  resolveRuntimeRequest(
    threadId: ThreadId,
    requestId: RuntimeRequestId,
    outcome: {
      readonly status: 'resolved' | 'cancelled' | 'expired'
      readonly decision?: ProviderApprovalDecision
      readonly feedback?: string
      readonly answers?: ProviderUserInputAnswers
    },
    commandId: CommandId | null = null,
  ): boolean {
    const projection = this.threads.get(threadId)
    const request = projection?.runtimeRequests.find(candidate => candidate.id === requestId)
    if (!projection || request?.status !== 'pending') return false
    const at = now()
    const node = projection.nodes.find(candidate => candidate.id === request.nodeId)
    const done =
      outcome.status !== 'resolved' || outcome.decision === 'decline' || outcome.decision === 'cancel'
        ? ('cancelled' as const)
        : ('completed' as const)
    const base = {
      threadId,
      ...(node?.runId == null ? {} : { runId: node.runId }),
      nodeId: request.nodeId,
      providerInstanceId: projection.thread.providerInstanceId,
      occurredAt: at,
    }
    this.emit(commandId, {
      ...base,
      type: 'runtime-request.updated',
      payload: {
        ...request,
        status: outcome.status,
        resolvedAt: at,
        ...(outcome.decision === undefined ? {} : { decision: outcome.decision }),
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.answers === undefined ? {} : { answers: outcome.answers }),
      },
    } as never)
    if (node) this.emit(commandId, { ...base, type: 'node.updated', payload: { ...node, status: done, completedAt: at } } as never)
    const item = projection.turnItems.find(
      candidate =>
        (candidate.type === 'approval_request' || candidate.type === 'user_input_request') && candidate.requestId === requestId,
    )
    if (item) {
      this.emit(commandId, {
        ...base,
        type: 'turn-item.updated',
        payload: {
          ...item,
          ...(item.type === 'user_input_request' && outcome.answers !== undefined
            ? {
              questionAnswer: {
                requestId,
                answers: outcome.answers,
                attachmentsByQuestionId: {},
                questionTextById: Object.fromEntries(item.questions.map(question => [question.id, question.question])),
              },
            }
            : {}),
          status: done,
          completedAt: at,
          updatedAt: at,
        },
      } as never)
    }
    this.flush()
    return true
  }

  /** Follows T3's Orchestrator.dispatchRuntimeRequestRespond; the driver delivers the answer to the provider. */
  private runtimeRequestRespond(
    command: Extract<OrchestrationV2ServerCommand, { readonly type: 'runtime-request.respond' }>,
    fail: (cause: string) => never,
  ): void {
    const projection = this.projection(command.threadId)
    const request = projection.runtimeRequests.find(candidate => candidate.id === command.requestId)
    if (request === undefined) return fail(`Runtime request ${command.requestId} was not found.`)
    if (request.status !== 'pending') fail(`Runtime request ${command.requestId} is ${request.status}.`)
    if (request.responseCapability.type === 'not_resumable') fail(request.responseCapability.reason)
    if (
      command.feedback !== undefined &&
      (request.responseCapability.type !== 'live' ||
        !request.responseCapability.supportsFeedback ||
        request.kind === 'user_input' ||
        command.decision !== 'decline' ||
        !command.feedback.trim())
    ) {
      fail('Feedback requires a live approval that supports it and a decline decision.')
    }
    if (command.attachmentsByQuestionId !== undefined && Object.keys(command.attachmentsByQuestionId).length > 0) {
      fail('Attachments in answers are not supported by this dsh Host.')
    }
    // As T3's decodeUserInputAnswers: text, a list of choices, or `{ answers }`.
    let answers: ProviderUserInputAnswers | undefined
    if (command.answers !== undefined) {
      const decoded: Record<string, unknown> = {}
      for (const [questionId, answer] of Object.entries(command.answers)) {
        const value = typeof answer === 'object' && answer !== null && !Array.isArray(answer)
          ? (answer as { readonly answers?: unknown }).answers
          : answer
        if (typeof value !== 'string' && !(Array.isArray(value) && value.every(entry => typeof entry === 'string'))) {
          fail('Answers must be text or lists of choices.')
        }
        decoded[questionId] = value
      }
      answers = decoded
    }
    const cancelled = command.decision === 'decline' || command.decision === 'cancel'
    if (request.kind === 'user_input' && !cancelled) {
      const item = projection.turnItems.find(
        candidate => candidate.type === 'user_input_request' && candidate.requestId === command.requestId,
      )
      if (item?.type !== 'user_input_request') return fail('The question for this request was not found.')
      if (item.questions.some(question => question.required !== false && !isMessageQuestionAnswer(answers?.[question.id]))) {
        fail('Answer each question before sending.')
      }
    }
    const driver = this.options.driverFor(projection.thread.providerInstanceId)
    if (!driver?.respond) return fail('This provider cannot take answers to runtime requests.')
    const response: RuntimeRequestResponse = {
      ...(command.decision === undefined ? {} : { decision: command.decision }),
      ...(command.feedback === undefined ? {} : { feedback: command.feedback }),
      ...(answers === undefined ? {} : { answers }),
    }
    try {
      driver.respond(command.threadId, request, response)
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
    this.resolveRuntimeRequest(command.threadId, command.requestId, { status: 'resolved', ...response }, command.commandId)
  }

  /** As T3's Orchestrator.dispatchThreadUserInputDismiss: only a question answered by message can be put away. */
  private userInputDismiss(
    command: Extract<OrchestrationV2ServerCommand, { readonly type: 'thread.user-input.dismiss' }>,
    fail: (cause: string) => never,
  ): void {
    const request = this.projection(command.threadId).runtimeRequests.find(candidate => candidate.id === command.requestId)
    if (request === undefined || request.status !== 'pending') return fail('This question has already been answered.')
    if (request.kind !== 'user_input' || request.responseCapability.type !== 'message') {
      fail('This question needs an answer. Answer it or stop the turn.')
    }
    this.resolveRuntimeRequest(command.threadId, command.requestId, { status: 'resolved', decision: 'cancel' }, command.commandId)
  }

  /** A turn a provider started on its own (a person prompting a dsh Session): recorded as a running run. */
  beginExternalRun(
    threadId: ThreadId,
    input: { readonly messageId: MessageId; readonly text: string; readonly createdBy: 'user' | 'agent' | 'system'; readonly freshContext?: boolean },
  ): RunId {
    const command: MessageDispatch = {
      type: 'message.dispatch',
      commandId: CommandId.make(`command:dsh:${randomUUID()}`),
      threadId,
      messageId: input.messageId,
      text: input.text,
      attachments: [],
      dispatchMode: { type: 'start_immediately' },
      createdBy: input.createdBy,
      creationSource: input.createdBy === 'user' ? 'web' : 'server',
      ...(input.freshContext ? { freshContext: true } : {}),
    }
    const run = this.createRun(command, now(), { external: true })
    this.runStarted(threadId, run.id, {})
    this.flush()
    return run.id
  }

  // ---- runtime ingestion (drivers) ----

  /** The provider began executing a run. */
  runStarted(
    threadId: ThreadId,
    runId: RunId,
    info: { readonly model?: string | undefined; readonly nativeThreadId?: string | undefined },
  ): void {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    if (!run || isTerminal(run.status)) return
    const at = now()
    const driver = this.options.driverKindOf(run.providerInstanceId)
    let providerThread = projection.providerThreads.find(candidate => candidate.id === projection.thread.activeProviderThreadId)
    if (!providerThread) {
      providerThread = {
        id: id(ProviderThreadId.make, 'provider-thread'),
        driver,
        providerInstanceId: run.providerInstanceId,
        providerSessionId: null,
        appThreadId: threadId,
        ownerNodeId: null,
        nativeThreadRef: info.nativeThreadId ? { driver, nativeId: info.nativeThreadId, strength: 'strong' } : null,
        nativeConversationHeadRef: null,
        status: 'active',
        firstRunOrdinal: run.ordinal,
        lastRunOrdinal: run.ordinal,
        handoffIds: [],
        forkedFrom: null,
        pendingBackgroundTasks: [],
        contextUsage: null,
        nativeMetadata: null,
        goal: null,
        createdAt: at,
        updatedAt: at,
      }
      this.emit(null, {
        type: 'provider-thread.updated',
        threadId,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: providerThread,
      } as never)
      this.emit(null, {
        type: 'thread.created',
        threadId,
        providerInstanceId: run.providerInstanceId,
        driver,
        occurredAt: at,
        payload: { ...projection.thread, activeProviderThreadId: providerThread.id },
      } as never)
    } else {
      const nativeThreadRef =
        info.nativeThreadId && info.nativeThreadId !== providerThread.nativeThreadRef?.nativeId
          ? { driver, nativeId: info.nativeThreadId, strength: 'strong' as const }
          : providerThread.nativeThreadRef
      this.emit(null, {
        type: 'provider-thread.updated',
        threadId,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: { ...providerThread, nativeThreadRef, status: 'active', lastRunOrdinal: run.ordinal, updatedAt: at },
      } as never)
    }
    const attemptId = id(RunAttemptId.make, 'attempt')
    const turnId = id(ProviderTurnId.make, 'provider-turn')
    const attempt: OrchestrationV2RunAttempt = {
      id: attemptId,
      runId,
      attemptOrdinal: 1,
      rootNodeId: run.rootNodeId as NodeId,
      providerInstanceId: run.providerInstanceId,
      providerThreadId: providerThread.id,
      providerTurnId: turnId,
      reason: 'initial',
      status: 'running',
      startedAt: at,
      completedAt: null,
    }
    const turn: OrchestrationV2ProviderTurn = {
      id: turnId,
      providerThreadId: providerThread.id,
      nodeId: run.rootNodeId as NodeId,
      runAttemptId: attemptId,
      nativeTurnRef: null,
      ordinal: projection.providerTurns.length + 1,
      status: 'running',
      startedAt: at,
      completedAt: null,
      ...(info.model ? { model: info.model } : {}),
    }
    this.emit(null, {
      type: 'run-attempt.created',
      threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: attempt,
    } as never)
    this.emit(null, {
      type: 'provider-turn.updated',
      threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: turn,
    } as never)
    this.emit(null, {
      type: 'run.updated',
      threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: { ...run, status: 'running', startedAt: at, activeAttemptId: attemptId, providerThreadId: providerThread.id },
    } as never)
    const node = projection.nodes.find(candidate => candidate.id === run.rootNodeId)
    if (node)
      this.emit(null, {
        type: 'node.updated',
        threadId,
        runId,
        nodeId: node.id,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: { ...node, status: 'running', startedAt: at, providerThreadId: providerThread.id, providerTurnId: turnId },
      } as never)
    this.flush()
  }

  /** The executed model, when the provider reports it after starting. */
  reportModel(threadId: ThreadId, runId: RunId, model: string): void {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    const turn = projection.providerTurns.filter(candidate => candidate.runAttemptId === run?.activeAttemptId).at(-1)
    if (!run || !turn) return
    this.emit(null, {
      type: 'provider-turn.updated',
      threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: now(),
      payload: { ...turn, model },
    } as never)
  }

  /** Append streamed assistant or reasoning text; consecutive chunks extend one item. */
  appendText(threadId: ThreadId, runId: RunId, kind: 'assistant_message' | 'reasoning', text: string, itemKey: string): void {
    if (text === '') return
    const existing = this.threads.get(threadId)?.turnItems.find(item => item.id === TurnItemId.make(`turn-item:${itemKey}`)) as
      | { text?: string }
      | undefined
    this.writeText(threadId, runId, kind, `${existing?.text ?? ''}${text}`, itemKey, { streaming: true })
  }

  /**
   * Set an assistant or reasoning item's whole text, as T3's adapters publish
   * a streamed item: the accumulated text while `streaming`, then the final
   * text with the item `completed` (or `status`, for an abandoned stream).
   */
  writeText(
    threadId: ThreadId,
    runId: RunId,
    kind: 'assistant_message' | 'reasoning',
    fullText: string,
    itemKey: string,
    options: { readonly streaming: boolean; readonly status?: 'completed' | 'interrupted' | 'failed' },
  ): void {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    if (!run) return
    const at = now()
    const itemId = TurnItemId.make(`turn-item:${itemKey}`)
    const existing = projection.turnItems.find(item => item.id === itemId) as
      | (OrchestrationV2TurnItem & { text?: string; messageId?: MessageId })
      | undefined
    if (existing === undefined && fullText === '') return
    const turn = projection.providerTurns.filter(candidate => candidate.runAttemptId === run.activeAttemptId).at(-1)
    const { streaming } = options
    const status = streaming ? ('running' as const) : (options.status ?? 'completed')
    const settled = streaming ? {} : { completedAt: at }
    if (kind === 'assistant_message') {
      const messageId = existing?.messageId ?? MessageId.make(`message:${itemKey}`)
      const prior = projection.messages.find(message => message.id === messageId)
      const message: OrchestrationV2ConversationMessage = {
        createdBy: 'agent',
        creationSource: 'provider',
        id: messageId,
        threadId,
        runId,
        nodeId: run.rootNodeId,
        role: 'assistant',
        text: fullText,
        attachments: [],
        streaming,
        createdAt: prior?.createdAt ?? at,
        updatedAt: at,
      }
      this.emit(null, {
        type: 'message.updated',
        threadId,
        runId,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: message,
      } as never)
      this.emitItem(threadId, run, {
        ...(existing ?? this.itemBase(threadId, run, itemId, turn?.id ?? null, at)),
        status,
        ...settled,
        updatedAt: at,
        type: 'assistant_message',
        messageId,
        text: fullText,
        streaming,
      } as OrchestrationV2TurnItem)
    } else {
      this.emitItem(threadId, run, {
        ...(existing ?? this.itemBase(threadId, run, itemId, turn?.id ?? null, at)),
        status,
        ...settled,
        updatedAt: at,
        type: 'reasoning',
        text: fullText,
        streaming,
      } as OrchestrationV2TurnItem)
    }
  }

  /** A provider tool call, recorded as a `dynamic_tool` item. */
  toolCall(
    threadId: ThreadId,
    runId: RunId,
    key: string,
    update: {
      readonly title?: string | null
      readonly toolName?: string | null
      readonly input?: unknown
      readonly output?: unknown
      readonly status?: OrchestrationV2TurnItem['status']
    },
  ): void {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    if (!run) return
    const at = now()
    const itemId = TurnItemId.make(`turn-item:${key}`)
    const existing = projection.turnItems.find(item => item.id === itemId) as
      | (OrchestrationV2TurnItem & Record<string, unknown>)
      | undefined
    const turn = projection.providerTurns.filter(candidate => candidate.runAttemptId === run.activeAttemptId).at(-1)
    this.emitItem(threadId, run, {
      ...(existing ?? {
        ...this.itemBase(threadId, run, itemId, turn?.id ?? null, at),
        type: 'dynamic_tool',
        toolName: null,
        input: null,
      }),
      ...(update.title === undefined ? {} : { title: update.title }),
      ...(update.toolName === undefined ? {} : { toolName: update.toolName }),
      ...(update.input === undefined ? {} : { input: update.input }),
      ...(update.output === undefined ? {} : { output: update.output }),
      status: update.status ?? existing?.status ?? 'running',
      updatedAt: at,
      ...(update.status === 'completed' || update.status === 'failed' ? { completedAt: at } : {}),
    } as OrchestrationV2TurnItem)
  }

  private itemBase(
    threadId: ThreadId,
    run: OrchestrationV2Run,
    itemId: TurnItemId,
    providerTurnId: ProviderTurnId | null,
    at: DateTime.Utc,
  ) {
    return {
      id: itemId,
      threadId,
      runId: run.id,
      nodeId: run.rootNodeId,
      providerThreadId: run.providerThreadId,
      providerTurnId,
      nativeItemRef: null,
      parentItemId: null,
      ordinal: this.nextOrdinal(threadId),
      status: 'running' as const,
      title: null,
      startedAt: at,
      completedAt: null,
      updatedAt: at,
    }
  }

  private emitItem(threadId: ThreadId, run: OrchestrationV2Run, item: OrchestrationV2TurnItem): void {
    this.emit(null, {
      type: 'turn-item.updated',
      threadId,
      runId: run.id,
      providerInstanceId: run.providerInstanceId,
      occurredAt: item.updatedAt,
      payload: item,
    } as never)
  }

  /** The provider finished a run (or a queued run was cancelled). */
  runEnded(threadId: ThreadId, runId: RunId, status: TerminalRunStatus, error: string | null): void {
    this.endRun(threadId, runId, status, error, null)
    this.startNext(threadId)
    this.settle()
    this.flush()
  }

  private endRun(
    threadId: ThreadId,
    runId: RunId,
    status: TerminalRunStatus,
    error: string | null,
    commandId: CommandId | null,
  ): void {
    const projection = this.projection(threadId)
    const run = projection.runs.find(candidate => candidate.id === runId)
    if (!run || isTerminal(run.status)) return
    const at = now()
    const finished = status === 'completed' ? ('completed' as const) : status === 'failed' ? ('failed' as const) : status
    for (const item of projection.turnItems) {
      if (item.runId !== runId || (item.status !== 'running' && item.status !== 'pending')) continue
      // As T3's run finalization: an app-owned delegation outlives the run that started it.
      if (item.type === 'subagent' && item.origin === 'app_owned') continue
      const done = {
        ...item,
        status: finished === 'completed' ? 'completed' : finished,
        completedAt: at,
        updatedAt: at,
        ...('streaming' in item ? { streaming: false } : {}),
      } as OrchestrationV2TurnItem
      this.emitItem(threadId, run, done)
    }
    for (const message of projection.messages) {
      if (message.runId === runId && message.streaming) {
        this.emit(commandId, {
          type: 'message.updated',
          threadId,
          runId,
          providerInstanceId: run.providerInstanceId,
          occurredAt: at,
          payload: { ...message, streaming: false, updatedAt: at },
        } as never)
      }
    }
    if (error !== null) {
      const turn = projection.providerTurns.filter(candidate => candidate.runAttemptId === run.activeAttemptId).at(-1)
      this.emitItem(threadId, run, {
        ...this.itemBase(threadId, run, id(TurnItemId.make, 'turn-item'), turn?.id ?? null, at),
        status: 'failed',
        completedAt: at,
        type: 'error',
        failure: { class: 'provider_error', message: error.trim().slice(0, 4_096) || 'The provider failed.', code: null, retryable: null },
      } as unknown as OrchestrationV2TurnItem)
    }
    // A live request cannot be answered once its run is over; a question answered by message outlives it.
    for (const request of projection.runtimeRequests) {
      if (request.status !== 'pending' || request.responseCapability.type === 'message') continue
      if (projection.nodes.find(node => node.id === request.nodeId)?.runId !== runId) continue
      this.resolveRuntimeRequest(threadId, request.id, { status: 'cancelled' }, commandId)
    }
    for (const turn of projection.providerTurns) {
      if (turn.runAttemptId === run.activeAttemptId && turn.status === 'running') {
        this.emit(commandId, {
          type: 'provider-turn.updated',
          threadId,
          runId,
          providerInstanceId: run.providerInstanceId,
          occurredAt: at,
          payload: { ...turn, status: finished, completedAt: at },
        } as never)
      }
    }
    const attempt = projection.attempts.find(candidate => candidate.id === run.activeAttemptId)
    if (attempt)
      this.emit(commandId, {
        type: 'run-attempt.updated',
        threadId,
        runId,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: { ...attempt, status: finished, completedAt: at },
      } as never)
    const node = projection.nodes.find(candidate => candidate.id === run.rootNodeId)
    if (node)
      this.emit(commandId, {
        type: 'node.updated',
        threadId,
        runId,
        nodeId: node.id,
        providerInstanceId: run.providerInstanceId,
        occurredAt: at,
        payload: { ...node, status: finished, completedAt: at },
      } as never)
    this.emit(commandId, {
      type: 'run.updated',
      threadId,
      runId,
      providerInstanceId: run.providerInstanceId,
      occurredAt: at,
      payload: { ...run, status, completedAt: at, ...(run.status === 'queued' ? { queueHeld: false } : {}) },
    } as never)
    this.prompts.delete(runId)
  }

  // ---- delegated task finalization and completion wake ----

  /** Wake a parent: a hook per provider kind (dsh steer/followup, ACP queued turn). */
  wakeParent?: (
    parentThreadId: ThreadId,
    text: string,
    message: { readonly parentRunId: RunId; readonly generation: number; readonly taskIds: ReadonlyArray<NodeId> },
  ) => boolean

  /**
   * Publish results of tasks whose work is done and wake their parents, as
   * T3's finalizeAppOwnedSubagent and completion delivery do. Repeats until no
   * task changes, so a grandchild's result can settle its parent's task too.
   */
  settle(): void {
    for (let pass = 0; pass < 10; pass++) {
      let changed = false
      for (const parent of this.threads.values()) {
        for (const task of parent.subagents) {
          if (task.origin !== 'app_owned' || task.childThreadId === null || task.result !== null) continue
          const child = this.threads.get(task.childThreadId)
          if (!child) continue
          const runs = child.runs.filter(run => run.delegatedTaskId === task.id).toSorted((a, b) => b.ordinal - a.ordinal)
          const run = runs[0]
          if (!run || !isTerminal(run.status)) continue
          // A finished turn with live child work is not done yet.
          if (child.subagents.some(sub => sub.origin === 'app_owned' && sub.status === 'running')) continue
          this.publishTask(parent, task, child, run)
          changed = true
        }
      }
      this.deliverCompletions()
      if (!changed) break
    }
  }

  private publishTask(
    parent: MutableProjection,
    task: OrchestrationV2Subagent,
    child: MutableProjection,
    run: OrchestrationV2Run,
  ): void {
    const at = now()
    const status = run.status === 'rolled_back' ? ('cancelled' as const) : (run.status as TerminalRunStatus)
    const result = subagentResultForRun(child, run).text
    const published: OrchestrationV2Subagent = {
      ...task,
      status,
      result,
      completedAt: at,
      updatedAt: at,
      completionDelivery:
        task.completionDelivery?.state === 'disposed' ? task.completionDelivery : { state: 'pending', observedByRunId: null },
    }
    const base = {
      threadId: parent.thread.id,
      ...(task.runId === null ? {} : { runId: task.runId }),
      providerInstanceId: task.providerInstanceId,
      occurredAt: at,
    }
    this.emit(null, { ...base, type: 'subagent.updated', nodeId: task.id, payload: published } as never)
    const node = parent.nodes.find(candidate => candidate.id === task.id)
    if (node)
      this.emit(null, { ...base, type: 'node.updated', nodeId: node.id, payload: { ...node, status, completedAt: at } } as never)
    const item = parent.turnItems.find(candidate => candidate.type === 'subagent' && candidate.subagentId === task.id)
    if (item)
      this.emitItem(
        parent.thread.id,
        { id: task.runId, providerInstanceId: task.providerInstanceId } as OrchestrationV2Run,
        { ...item, status, result, completedAt: at, updatedAt: at } as OrchestrationV2TurnItem,
      )
    const transfer: OrchestrationV2ContextTransfer = {
      id: id(ContextTransferId.make, 'transfer'),
      type: 'subagent_result',
      sourceThreadId: child.thread.id,
      targetThreadId: parent.thread.id,
      sourcePoint: { threadId: child.thread.id, runId: run.id },
      basePoint: null,
      sourceProviderInstanceId: run.providerInstanceId,
      targetProviderInstanceId: parent.thread.providerInstanceId,
      targetRunId: task.runId,
      status: 'consumed',
      resolution: null,
      createdBy: 'system',
      error: null,
      createdAt: at,
      updatedAt: at,
      consumedAt: at,
    }
    this.emit(null, { ...base, type: 'context-transfer.created', payload: transfer } as never)
  }

  private readonly deliveryGenerations = new Map<string, number>()

  /**
   * Wake parents for published, undelivered tasks. As T3: `always` wakes on
   * completion; `settled_only` (a wait delegation) wakes only once the run that
   * launched the task is no longer active, since the wait delivers otherwise.
   */
  private deliverCompletions(): void {
    if (!this.wakeParent) return
    for (const parent of this.threads.values()) {
      const ready = parent.subagents.filter((task) => {
        if (task.origin !== 'app_owned' || task.result === null || task.completionDelivery?.state !== 'pending') return false
        if (task.completionWake !== 'settled_only') return true
        const launching = parent.runs.find(run => run.id === task.runId)
        return launching === undefined || !isActive(launching)
      })
      if (ready.length === 0) continue
      const byRun = new Map<string, OrchestrationV2Subagent[]>()
      for (const task of ready) byRun.set(String(task.runId), [...(byRun.get(String(task.runId)) ?? []), task])
      for (const [parentRunId, tasks] of byRun) {
        const key = `${parent.thread.id}:${parentRunId}`
        const generation = (this.deliveryGenerations.get(key) ?? 0) + 1
        const taskIds = tasks.map(task => task.id)
        const text = delegatedCompletionWakeDetail(taskIds, parent.subagents)
        const delivered = this.wakeParent(parent.thread.id, text, { parentRunId: RunId.make(parentRunId), generation, taskIds })
        if (!delivered) continue
        this.deliveryGenerations.set(key, generation)
        const at = now()
        for (const task of tasks) {
          this.emit(null, {
            type: 'subagent.updated',
            threadId: parent.thread.id,
            ...(task.runId === null ? {} : { runId: task.runId }),
            nodeId: task.id,
            providerInstanceId: task.providerInstanceId,
            occurredAt: at,
            payload: { ...task, completionDelivery: { state: 'delivered', observedByRunId: null }, updatedAt: at },
          } as never)
        }
      }
    }
  }
}

export const projectIdForCwd = (cwd: string) => ProjectId.make(cwd)
