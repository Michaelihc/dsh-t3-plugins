/**
 * Runs engine runs on dsh Sessions: a dsh-native thread is a dsh Session. Its
 * turns are mirrored into the engine as runs (including turns a person starts
 * in the dsh UI), its assistant messages, reasoning, and tool calls as turn
 * items. Engine runs start with `followup`, steers use `steer`, interrupts
 * cancel the active turn.
 */
import { createHash } from 'node:crypto'
import * as DateTime from 'effect/DateTime'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import {
  type ProviderInteractionMode as InteractionMode,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  type OrchestrationV2AppThread,
  type OrchestrationV2Run,
  type RunId,
  type RuntimeMode,
  ThreadId,
} from '../t3/contracts/index.ts'
import type { DshOrchestratorEngine, RunDriver } from './engine.ts'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** A message an orchestrator tool or a delegated-task completion sent to this Session. */
    't3-orchestrator': {
      readonly kind: 't3-orchestrator'
      readonly form: 'notice'
      readonly summary: string
      readonly runId?: string
    }
  }
}

export const DSH_PROVIDER_INSTANCE_ID = ProviderInstanceId.make('dsh')

/** A Session id for a thread id: the same when it is a plain id, else a stable hash. */
export function sessionIdForThread(threadId: string): string {
  return /^[A-Za-z0-9_-]{1,120}$/.test(threadId)
    ? threadId
    : `t3-${createHash('sha256').update(threadId).digest('hex').slice(0, 32)}`
}

export interface DshSessionDriverOptions {
  readonly ctx: Context
  readonly engine: DshOrchestratorEngine
  /** Modes a dsh Session acts with; dsh has no per-Session runtime or interaction mode. */
  readonly runtimeMode: RuntimeMode
  readonly interactionMode: InteractionMode
  /** Route for Sessions this driver creates. */
  readonly agentOptions: { readonly provider?: string; readonly model?: string }
  /** The orchestrator's MCP server key; its native tools are recorded under T3's bare tool names. */
  readonly serverKey?: string
}

interface TurnCursor {
  turn: number
  runId: RunId | null
}

const textBlocks = (content: unknown): string =>
  Array.isArray(content)
    ? content
      .flatMap((block: { type?: string; text?: string }) =>
        block.type === 'text' && typeof block.text === 'string' ? [block.text] : [],
      )
      .join('')
    : ''

/** Tool arguments as an object when they are JSON, as T3 records a tool's input. */
function parsedArguments(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

const TURN_STATUS: Record<string, 'completed' | 'failed' | 'interrupted'> = {
  completed: 'completed',
  'max-tokens': 'completed',
  forked: 'completed',
  aborted: 'interrupted',
  interrupted: 'interrupted',
  blocked: 'failed',
  error: 'failed',
}

export class DshSessionDriver implements RunDriver {
  readonly canSteer = true
  private readonly threadBySession = new Map<string, ThreadId>()
  private readonly cursors = new Map<string, TurnCursor>()
  /** dsh message id -> engine run, for runs the engine started. */
  private readonly pending = new Map<string, RunId>()
  private readonly stopping = new Map<string, 'interrupted' | 'cancelled'>()

  constructor(private readonly options: DshSessionDriverOptions) {
    for (const threadId of options.engine.threadIds()) {
      if (options.engine.projection(threadId).thread.providerInstanceId === DSH_PROVIDER_INSTANCE_ID) {
        this.threadBySession.set(sessionIdForThread(threadId), threadId)
      }
    }
    options.ctx.on(
      'session/event',
      (session, event) => {
        let threadId = this.threadBySession.get(String(session.id))
        if (event.type === 'turn/start') {
          const agent = options.ctx.get('agents')?.get(session.id)
          const known = threadId ?? options.engine.threadIds().find(id => sessionIdForThread(id) === String(session.id))
          if (agent && known) {
            this.threadBySession.set(String(session.id), known)
            threadId = this.ensureThread(agent)
          }
        }
        if (threadId && options.engine.projection(threadId).thread.providerInstanceId === DSH_PROVIDER_INSTANCE_ID) {
          this.apply(threadId, event as SessionEvent)
        }
      },
      { global: true },
    )
  }

  private agent(threadId: ThreadId): Agent | undefined {
    return this.options.ctx.get('agents')?.get(sessionIdForThread(threadId) as SessionId) ?? undefined
  }

  /** The calling Session as a thread, registered on its first tool call with its current turn as the active run. */
  ensureThread(agent: Agent): ThreadId {
    const { engine } = this.options
    const threadId = this.threadBySession.get(String(agent.id))
      ?? engine.threadIds().find(id => sessionIdForThread(id) === String(agent.id))
      ?? ThreadId.make(String(agent.id))
    const selection = agent.model.current()
    const instance = selection?.provider === 't3-acp' ? ProviderInstanceId.make(selection.model) : DSH_PROVIDER_INSTANCE_ID
    const selectedModel = selection?.provider === 't3-acp' ? 'default' : selection?.model ?? 'default'
    if (engine.hasThread(threadId)) engine.selectSessionProvider(threadId, instance, selectedModel)
    if (!engine.hasThread(threadId)) {
      const at = DateTime.nowUnsafe()
      const cwd = agent.session.header.cwd ?? process.cwd()
      const thread = {
        createdBy: 'user',
        creationSource: 'web',
        id: threadId,
        projectId: ProjectId.make(cwd),
        title: `dsh ${String(agent.id).slice(0, 12)}`,
        providerInstanceId: instance,
        modelSelection: { instanceId: instance, model: selectedModel },
        runtimeMode: this.options.runtimeMode,
        interactionMode: this.options.interactionMode,
        branch: null,
        worktreePath: null,
        activeProviderThreadId: null,
        lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
        forkedFrom: null,
        createdAt: at,
        updatedAt: at,
        archivedAt: null,
        settledOverride: null,
        settledAt: null,
        lastVisitedAt: null,
        deletedAt: null,
      }
      engine.registerThread(thread as unknown as OrchestrationV2AppThread)
      this.threadBySession.set(String(agent.id), threadId)
      // Mirror the turn in progress so the Session has an active run to act from.
      const events = agent.session.snapshotEvents()
      const lastStart = events.findLast(event => event.type === 'turn/start')
      const lastEnd = events.findLast(event => event.type === 'turn/end')
      if (instance === DSH_PROVIDER_INSTANCE_ID && lastStart && (!lastEnd || Number(lastEnd.seq) < Number(lastStart.seq))) {
        for (const event of events.filter(event => Number(event.seq) >= Number(lastStart.seq))) this.apply(threadId, event)
      }
    }
    this.threadBySession.set(String(agent.id), threadId)
    return threadId
  }

  startRun(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): void {
    void this.start(threadId, run, prompt).catch((error: unknown) => {
      this.options.engine.runEnded(threadId, run.id, 'failed', error instanceof Error ? error.message : String(error))
    })
  }

  private async start(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): Promise<void> {
    let agent = this.agent(threadId)
    if (!agent) agent = await this.createSession(threadId, run)
    const message = createUserMessage({
      content: [{ type: 'text', text: prompt }],
      source: {
        kind: 't3-orchestrator',
        form: 'notice',
        summary: boundContextSummary(prompt.split('\n')[0] ?? ''),
        runId: run.id,
      },
    })
    this.pending.set(message.id, run.id)
    agent.followup(message)
  }

  /** A new dsh Session for a thread the engine created (a delegated child or a created thread). */
  private async createSession(threadId: ThreadId, run: OrchestrationV2Run): Promise<Agent> {
    this.threadBySession.set(sessionIdForThread(threadId), threadId)
    const model =
      run.modelSelection.model && run.modelSelection.model !== 'default'
        ? run.modelSelection.model
        : this.options.agentOptions.model
    return createThreadSession(this.options.ctx, this.options.engine, threadId, {
      ...this.options.agentOptions,
      ...(model ? { model } : {}),
    }, { runtimeMode: this.options.engine.projection(threadId).thread.runtimeMode })
  }

  steer(threadId: ThreadId, run: OrchestrationV2Run, text: string): boolean {
    const agent = this.agent(threadId)
    if (!agent || agent.status !== 'running') return false
    const message = createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 't3-orchestrator', form: 'notice', summary: boundContextSummary(text.split('\n')[0] ?? ''), runId: run.id },
    })
    this.pending.set(message.id, run.id)
    agent.steer(message)
    return true
  }

  interrupt(threadId: ThreadId, runId: RunId, intent: 'interrupted' | 'cancelled'): void {
    const agent = this.agent(threadId)
    if (!agent) {
      this.options.engine.runEnded(threadId, runId, intent, null)
      return
    }
    this.stopping.set(runId, intent)
    agent.cancel({ kind: 'parent' }, { keepInbox: intent === 'interrupted' })
  }

  // ---- mirroring dsh Session events ----

  private apply(threadId: ThreadId, event: SessionEvent): void {
    const { engine } = this.options
    const key = sessionIdForThread(threadId)
    switch (event.type) {
      case 'turn/start':
        this.cursors.set(key, { turn: event.data.turn, runId: null })
        return
      case 'user/message': {
        const cursor = this.cursors.get(key)
        if (!cursor) return
        const message = event.data
        const runId = this.pending.get(message.id)
        if (runId) this.pending.delete(message.id)
        if (cursor.runId === null) {
          cursor.runId =
            runId ??
            engine.beginExternalRun(threadId, {
              messageId: MessageId.make(`message:${message.id}`),
              text: textBlocks(message.content),
              createdBy: (message.source as { kind?: string } | undefined)?.kind === 'user' ? 'user' : 'system',
            })
          if (runId) engine.runStarted(threadId, runId, {})
        }
        return
      }
      case 'assistant/message': {
        const cursor = this.cursors.get(key)
        if (!cursor?.runId) return
        const content = event.data.message.content
        const reasoning = Array.isArray(content)
          ? content
            .flatMap((block: { type?: string; text?: string; thinking?: string }) =>
              block.type === 'reasoning' || block.type === 'thinking' ? [block.text ?? block.thinking ?? ''] : [],
            )
            .join('')
          : ''
        if (reasoning) engine.appendText(threadId, cursor.runId, 'reasoning', reasoning, `${event.data.message.id}:reasoning`)
        const text = textBlocks(content)
        if (text) engine.appendText(threadId, cursor.runId, 'assistant_message', text, String(event.data.message.id))
        const model = (event.data.message as { model?: string }).model
        if (model) engine.reportModel(threadId, cursor.runId, model)
        return
      }
      case 'tool/call': {
        const cursor = this.cursors.get(key)
        if (!cursor?.runId) return
        // T3's presentation and wait detection know its tools by name, not by this Host's server key.
        const prefix = `mcp__${(this.options.serverKey ?? '').replace(/[^A-Za-z0-9_-]/g, '_')}__`
        const toolName = this.options.serverKey !== undefined && event.data.name.startsWith(prefix)
          ? event.data.name.slice(prefix.length)
          : event.data.name
        engine.toolCall(threadId, cursor.runId, `${cursor.runId}:tool:${String(event.data.callId)}`, {
          title: event.data.name,
          toolName,
          input: parsedArguments(event.data.arguments),
          status: 'running',
        })
        return
      }
      case 'tool/result': {
        const cursor = this.cursors.get(key)
        if (!cursor?.runId) return
        const result = event.data.message as { toolCallId?: string; isError?: boolean }
        if (result.toolCallId) {
          engine.toolCall(threadId, cursor.runId, `${cursor.runId}:tool:${result.toolCallId}`, {
            status: result.isError ? 'failed' : 'completed',
          })
        }
        return
      }
      case 'turn/end': {
        const cursor = this.cursors.get(key)
        this.cursors.delete(key)
        if (!cursor?.runId) return
        const reason = event.data.reason
        let status: 'completed' | 'failed' | 'interrupted' | 'cancelled' = TURN_STATUS[reason.kind] ?? 'completed'
        const intent = this.stopping.get(cursor.runId)
        if (status === 'interrupted' && intent) status = intent
        this.stopping.delete(cursor.runId)
        const error =
          reason.kind === 'error' ? String((reason as { error?: { message?: string } }).error?.message ?? 'error') : null
        engine.runEnded(threadId, cursor.runId, status, error)
        return
      }
      default:
        return
    }
  }
}

/**
 * The sandbox mode and approval policy a dsh Session runs a thread's runtime
 * mode with. No person answers a child's approvals, so every mode pins
 * `never` and the sandbox carries the mode, as the Codex driver does:
 * `full-access` bypasses the sandbox, `auto` and `auto-accept-edits` write only
 * inside the workspace, and `approval-required` is read-only.
 */
export function dshSessionPolicy(mode: RuntimeMode): {
  readonly sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access'
  readonly approvalPolicy: 'never'
} {
  switch (mode) {
    case 'full-access':
      return { sandboxMode: 'danger-full-access', approvalPolicy: 'never' }
    case 'auto':
    case 'auto-accept-edits':
      return { sandboxMode: 'workspace-write', approvalPolicy: 'never' }
    default:
      return { sandboxMode: 'read-only', approvalPolicy: 'never' }
  }
}

/** Seed the policy as dsh's subagents do: `source: 'delegation'` events before the Agent is published. */
function appendSessionPolicy(ctx: Context, session: Agent['session'], mode: RuntimeMode): void {
  const policy = dshSessionPolicy(mode)
  const log = session as unknown as { append(type: string, data: unknown): void }
  if (ctx.get('sandboxPolicy') !== undefined) log.append('sandbox/mode', { mode: policy.sandboxMode, source: 'delegation' })
  if (ctx.get('approval') !== undefined) log.append('approval/policy', { policy: policy.approvalPolicy, source: 'delegation' })
}

/**
 * Create the dsh Session that backs an engine thread: the default agent preset, the
 * thread's working directory and Workspace, and the thread's title. With
 * `runtimeMode`, the Session's sandbox mode and approval policy follow
 * {@link dshSessionPolicy} instead of the user's default permission preset.
 */
export async function createThreadSession(
  ctx: Context,
  engine: DshOrchestratorEngine,
  threadId: ThreadId,
  agentOptions: { readonly provider?: string; readonly model?: string },
  options: { readonly runtimeMode?: RuntimeMode } = {},
): Promise<Agent> {
  const agents = ctx.get('agents')
  if (!agents) throw new Error('The dsh agent registry is not available.')
  const thread = engine.projection(threadId).thread
  const sessionId = sessionIdForThread(threadId)
  const cwd = thread.worktreePath ?? String(thread.projectId)
  const presets = ctx.get('agentPresets')
  const preset = presets ? await presets.resolve(undefined).catch(() => undefined) : undefined
  const { runtimeMode } = options
  await agents.create({
    sessionId: sessionId as SessionId,
    meta: { cwd, ...(preset ? { agentPreset: preset.id } : {}) },
    agentOptions: { ...agentOptions },
    ...((presets && preset) || runtimeMode !== undefined
      ? {
        setup: async (agentCtx: Context, agent: Agent) => {
          if (runtimeMode !== undefined) appendSessionPolicy(ctx, agent.session, runtimeMode)
          if (presets && preset) await presets.mount(agentCtx, preset.id)
        },
      }
      : {}),
  })
  const workspaces = ctx.get('workspaceRegistry')
  if (workspaces) {
    const workspace = await workspaces.create(cwd).catch(() => undefined)
    await workspace?.attachSession(sessionId as SessionId).catch(() => {})
  }
  const agent = ctx.get('agents')?.get(sessionId as SessionId)
  if (!agent) throw new Error(`dsh Session ${sessionId} did not start.`)
  // AgentOptions are a live fallback, not a selection visible to the composer.
  if (agentOptions.provider && agentOptions.model) {
    agent.model.select({ provider: agentOptions.provider, model: agentOptions.model })
  }
  ctx.get('sessionTitle')?.rename(agent.session, thread.title)
  return agent
}
