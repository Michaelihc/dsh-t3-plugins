/**
 * ACP threads as dsh Sessions. Each thread whose provider is an ACP agent is backed by
 * a dsh Session whose model route is `t3-acp/<agent id>`. That route's adapter does not
 * call a model: it relays the turn the ACP agent is running for the thread, so the
 * Session's own agent loop records the child's messages, reasoning and tool calls, and
 * the Session reports Working and Done like any other. The ACP process, MCP injection,
 * permission answers and the engine's thread projection stay with AcpRunDriver.
 *
 * One ACP prompt is one dsh turn. The turn is cut into steps at each ACP tool call, as
 * the agent loop needs: the step ends with a call of the `acp_tool_call` card tool, whose
 * execution waits for the ACP tool to finish and returns its output. The next step then
 * continues reading the same prompt. Nothing is sent to the agent twice.
 */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  boundContextSummary,
  createUserMessage,
  type GenerateOptions,
  LlmAdapter,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
  type StreamChunk,
  ToolCallId,
} from '@deepseek-ai/dsh-llm'
import type { Session, SessionId } from '@deepseek-ai/dsh-session'
import { MessageId, type OrchestrationV2Run, type RunId, ThreadId } from '../t3/contracts/index.ts'
import type { AcpAgentConfig, AcpRunObserver } from './acp.ts'
import type { DshOrchestratorEngine, RunDriver } from './engine.ts'
import { createThreadSession, sessionIdForThread } from './session.ts'
import { recordSessionHandoff, sessionHandoff } from './handoff.ts'
import { DEFAULT_HANDOFF_TOKEN_CAP } from '../t3/provider-core/handoffBudget.ts'

/** The model route that relays ACP agents. */
export const ACP_SESSION_PROVIDER = 't3-acp'
/** The card tool an ACP tool call becomes in the Session. */
export const ACP_TOOL_NAME = 'acp_tool_call'

type TerminalStatus = 'completed' | 'failed' | 'interrupted' | 'cancelled'

type TurnEvent =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'reasoning'; readonly text: string }
  | { readonly kind: 'tool'; readonly id: string; readonly args: AcpToolArgs }
  | { readonly kind: 'end'; readonly status: TerminalStatus; readonly error: string | null }

/** Arguments of an `acp_tool_call` card: what the agent reported when the tool started. */
interface AcpToolArgs {
  readonly title: string
  readonly kind: string | null
  readonly input?: unknown
  readonly toolCallId: string
}

interface ToolState {
  output: string
  failed: boolean
  readonly settled: PromiseWithResolvers<void>
  done: boolean
}

/** The ACP prompt a thread is running, read by the adapter in segments. */
class AcpTurn {
  private readonly queue: TurnEvent[] = []
  private wake: (() => void) | undefined
  readonly tools = new Map<string, ToolState>()
  ended = false

  constructor(readonly threadId: ThreadId, readonly runId: RunId) {}

  push(event: TurnEvent): void {
    this.queue.push(event)
    this.wake?.()
  }

  async next(signal: AbortSignal | undefined): Promise<TurnEvent> {
    while (this.queue.length === 0) {
      signal?.throwIfAborted()
      await new Promise<void>((resolve) => {
        const done = (): void => {
          signal?.removeEventListener('abort', done)
          this.wake = undefined
          resolve()
        }
        this.wake = done
        signal?.addEventListener('abort', done, { once: true })
      })
    }
    return this.queue.shift() as TurnEvent
  }

  /** Text after a tool, or the end of the prompt, settles the tools still open. */
  settleOpen(): void {
    for (const tool of this.tools.values()) this.settle(tool)
  }

  settle(tool: ToolState): void {
    if (tool.done) return
    tool.done = true
    tool.settled.resolve()
  }
}

const textOf = (content: unknown): string => {
  if (content === null || typeof content !== 'object') return ''
  const block = content as { type?: unknown; text?: unknown }
  return block.type === 'text' && typeof block.text === 'string' ? block.text : ''
}

/** Readable output of an ACP tool update: its content blocks, else its raw output. */
function toolOutput(update: Readonly<Record<string, unknown>>): string | null {
  const content = Array.isArray(update.content) ? (update.content as Record<string, unknown>[]) : []
  const parts = content.flatMap((entry) => {
    if (entry.type === 'content') return [textOf(entry.content)]
    if (entry.type === 'diff' && typeof entry.path === 'string') return [`Edited ${entry.path}`]
    if (entry.type === 'terminal') return ['(terminal output)']
    return []
  }).filter(part => part !== '')
  if (parts.length > 0) return parts.join('\n')
  if (update.rawOutput === undefined || update.rawOutput === null) return null
  return typeof update.rawOutput === 'string' ? update.rawOutput : JSON.stringify(update.rawOutput, null, 2)
}

const OUTPUT_LIMIT = 8_000
const clip = (text: string): string => (text.length > OUTPUT_LIMIT ? `${text.slice(0, OUTPUT_LIMIT)}\n…` : text)

/** dsh's card kinds are ACP's tool kinds without `think` and `switch_mode`. */
const CARD_KINDS = new Set(['read', 'edit', 'delete', 'move', 'search', 'execute', 'fetch'])

/** Text of the request's newest user-authored messages: what a person typed into the Session. */
function typedPrompt(session: Session): string {
  const events = session.snapshotEvents()
  const start = events.findLastIndex(event => event.type === 'turn/start')
  if (start < 0) throw new Error('The native Session has no active turn.')
  return events.slice(start + 1).flatMap((event) => {
    if (event.type !== 'user/message') return []
    const { source, content } = event.data
    if (source.kind !== 'user' && source.kind !== 't3-orchestrator') return []
    const text = content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
    return text.trim() ? [text] : []
  }).join('\n\n')
}

export interface AcpSessionBridgeOptions {
  readonly ctx: Context
  readonly engine: DshOrchestratorEngine
  readonly ensureThread?: (agent: Agent) => ThreadId
  readonly handoffTokenCap?: number
  readonly agents: readonly AcpAgentConfig[]
  readonly log?: (message: string, error?: unknown) => void
}

/**
 * Runs ACP threads through dsh Sessions. Holds one RunDriver per agent (its
 * `forAgent`), the `t3-acp` model adapter, and the card tool.
 */
export class AcpSessionBridge implements AcpRunObserver {
  private readonly threadBySession = new Map<string, ThreadId>()
  private readonly turns = new Map<ThreadId, AcpTurn>()
  /** Engine runs waiting for their Session's turn to reach the adapter. */
  private readonly pending = new Map<ThreadId, { readonly run: OrchestrationV2Run; readonly prompt: string }>()
  private readonly stopping = new Set<RunId>()
  private readonly drivers = new Map<string, RunDriver>()

  private readonly handoffTokenCap: number

  constructor(private readonly options: AcpSessionBridgeOptions) {
    this.handoffTokenCap = options.handoffTokenCap ?? DEFAULT_HANDOFF_TOKEN_CAP
    const agentIds = new Set(options.agents.map(agent => agent.id))
    for (const threadId of options.engine.threadIds()) {
      if (agentIds.has(options.engine.projection(threadId).thread.providerInstanceId)) {
        this.threadBySession.set(sessionIdForThread(threadId), threadId)
      }
    }
  }

  attach(agentId: string, driver: RunDriver): void {
    this.drivers.set(agentId, driver)
  }

  /** The RunDriver the engine uses for one agent's threads. */
  forAgent(agentId: string): RunDriver {
    return {
      canSteer: false,
      startRun: (threadId, run, prompt) => this.startRun(agentId, threadId, run, prompt),
      steer: () => false,
      interrupt: (threadId, runId, intent) => this.interrupt(agentId, threadId, runId, intent),
    }
  }

  /** Register the `t3-acp` route and the card tool; returns their disposer. */
  register(): () => void {
    const { ctx } = this.options
    const disposers: (() => void)[] = []
    const llm = ctx.get('llm')
    if (llm) {
      const handle = llm.registerAdapter([ACP_SESSION_PROVIDER], new AcpSessionAdapter(this))
      disposers.push(() => handle())
    }
    disposers.push(ctx.on('agent/pre-step', async ({ agent, modelSelection }, next) => {
      const threadId = this.threadBySession.get(String(agent.id))
      const turn = threadId ? this.turns.get(threadId) : undefined
      if (turn && (modelSelection.provider !== ACP_SESSION_PROVIDER
        || modelSelection.model !== this.options.engine.projection(turn.threadId).thread.providerInstanceId)) {
        this.abandon(turn)
        throw new Error('The backend changed during a native turn. The old turn was stopped; send a new message to continue with a context handoff.')
      }
      return next()
    }, { global: true }))
    disposers.push(ctx.on('session/event', (session, event) => {
      if (event.type !== 'turn/end') return
      const threadId = this.threadBySession.get(String(session.id))
      const turn = threadId ? this.turns.get(threadId) : undefined
      if (turn) this.abandon(turn)
    }, { global: true }))
    const tools = ctx.get('tools')
    if (tools) {
      disposers.push(
        tools.register(
          {
            name: ACP_TOOL_NAME,
            description: 'A tool call the ACP agent behind this Session made. It is run by the agent, never by this Session.',
            parameters: {
              type: 'object',
              // A Session's step list summarises a call by its first argument, so the title leads.
              properties: {
                title: { type: 'string' },
                kind: { type: ['string', 'null'] },
                input: {},
                toolCallId: { type: 'string' },
              },
              required: ['toolCallId', 'title'],
            },
            output: {
              schema: { type: 'object' },
              render: (_args, value) => [{ type: 'text', text: String((value as { output?: unknown }).output ?? '') }],
            },
            presentCall: (args) => {
              const call = args as Partial<AcpToolArgs>
              return {
                card: 'generic',
                title: typeof call.title === 'string' && call.title !== '' ? call.title : 'Tool call',
                kind: CARD_KINDS.has(call.kind ?? '') ? (call.kind as 'read') : 'other',
                ...(call.input === undefined || call.input === null ? {} : { rawInput: call.input }),
              }
            },
            execute: async (args, exec) => {
              const call = args as unknown as AcpToolArgs
              const threadId = exec.agent ? this.threadBySession.get(String(exec.agent.id)) : undefined
              const tool = threadId ? this.turns.get(threadId)?.tools.get(call.toolCallId) : undefined
              if (!tool) return { output: '' }
              await tool.settled.promise
              if (tool.failed) throw new Error(tool.output || `${call.title} failed.`)
              return { output: tool.output }
            },
          },
          { when: ({ modelSelection }) => modelSelection.provider === ACP_SESSION_PROVIDER },
        ),
      )
    }
    return () => {
      for (const dispose of disposers.splice(0)) dispose()
    }
  }

  threadOf(sessionId: string | undefined): ThreadId | undefined {
    if (sessionId === undefined) return undefined
    const existing = this.threadBySession.get(sessionId)
    // A pending or streaming run owns its provider until completion, regardless of the next selection.
    if (existing && (this.turns.has(existing) || this.pending.has(existing))) return existing
    const agent = this.options.ctx.get('agents')?.get(sessionId as SessionId)
    if (!agent || !this.options.ensureThread) return existing
    const threadId = this.options.ensureThread(agent)
    this.threadBySession.set(sessionId, threadId)
    return threadId
  }

  title(threadId: ThreadId): string {
    return this.options.engine.projection(threadId).thread.title
  }

  agentConfig(agentId: string): AcpAgentConfig | undefined {
    return this.options.agents.find(agent => agent.id === agentId)
  }

  /** Session relay routes, named for their actual ACP agents, not an underlying model. */
  models(): readonly LlmModelInfo[] {
    return this.options.agents.map(agent => ({ provider: ACP_SESSION_PROVIDER, id: agent.id, name: agent.displayName ?? agent.id }))
  }

  private agent(threadId: ThreadId): Agent | undefined {
    return this.options.ctx.get('agents')?.get(sessionIdForThread(threadId) as SessionId) ?? undefined
  }

  private startRun(agentId: string, threadId: ThreadId, run: OrchestrationV2Run, prompt: string): void {
    this.threadBySession.set(sessionIdForThread(threadId), threadId)
    this.pending.set(threadId, { run, prompt })
    void (async () => {
      const agent =
        this.agent(threadId) ??
        (await createThreadSession(this.options.ctx, this.options.engine, threadId, {
          provider: ACP_SESSION_PROVIDER,
          model: agentId,
        }))
      const selected = agent.model.current()
      if (selected?.provider !== ACP_SESSION_PROVIDER || selected.model !== agentId) {
        throw new Error('The conversation backend changed before the native run started. Retry on the selected backend.')
      }
      agent.followup(
        createUserMessage({
          content: [{ type: 'text', text: prompt }],
          source: {
            kind: 't3-orchestrator',
            form: 'notice',
            summary: boundContextSummary(prompt.split('\n')[0] ?? ''),
            runId: run.id,
          },
        }),
      )
    })().catch((error: unknown) => {
      if (this.pending.get(threadId)?.run.id === run.id) this.pending.delete(threadId)
      this.options.engine.runEnded(threadId, run.id, 'failed', error instanceof Error ? error.message : String(error))
    })
  }

  private interrupt(agentId: string, threadId: ThreadId, runId: RunId, intent: 'interrupted' | 'cancelled'): void {
    if (this.pending.get(threadId)?.run.id === runId) {
      // Its turn has not reached the agent yet.
      this.pending.delete(threadId)
      this.options.engine.runEnded(threadId, runId, intent, null)
    } else {
      this.stopping.add(runId)
      this.drivers.get(agentId)?.interrupt(threadId, runId, intent)
    }
    this.agent(threadId)?.cancel({ kind: 'parent' }, { keepInbox: intent === 'interrupted' })
  }

  /** The turn the adapter reads: the one in progress, else a new ACP prompt. */
  turnFor(threadId: ThreadId): AcpTurn {
    const current = this.turns.get(threadId)
    if (current) return current
    const { engine } = this.options
    const thread = engine.projection(threadId).thread
    const driver = this.drivers.get(thread.providerInstanceId)
    if (!driver) throw new Error(`No ACP agent ${thread.providerInstanceId} is configured.`)
    const queued = this.pending.get(threadId)
    const agent = this.agent(threadId)
    if (!agent) throw new Error('The native Session is not available.')
    const userPrompt = queued?.prompt ?? typedPrompt(agent.session)
    const route = { provider: ACP_SESSION_PROVIDER, model: String(thread.providerInstanceId) }
    const handoff = sessionHandoff(agent.session, route.provider, route.model, this.handoffTokenCap)
    let run: OrchestrationV2Run
    if (queued) run = handoff === null ? queued.run : engine.prepareRunHandoff(threadId, queued.run.id)
    else {
      const runId = engine.beginExternalRun(threadId, {
        messageId: MessageId.make(`message:${randomUUID()}`),
        text: userPrompt,
        createdBy: 'user',
        ...(handoff !== null ? { freshContext: true } : {}),
      })
      run = engine.projection(threadId).runs.find(candidate => candidate.id === runId) as OrchestrationV2Run
    }
    if (handoff !== null) recordSessionHandoff(agent.session, route.provider, route.model, handoff)
    const prompt = handoff === null ? userPrompt : `${handoff}\n\nUser message:\n${userPrompt}`
    const turn = new AcpTurn(threadId, run.id)
    this.turns.set(threadId, turn)
    this.pending.delete(threadId)
    driver.startRun(threadId, run, prompt)
    return turn
  }

  /** Settle a run whose adapter setup failed before streaming began. */
  setupFailed(threadId: ThreadId, error: unknown): void {
    const pending = this.pending.get(threadId)
    this.pending.delete(threadId)
    if (pending) this.options.engine.runEnded(threadId, pending.run.id, 'failed', String(error))
    const turn = this.turns.get(threadId)
    if (turn) this.abandon(turn)
  }

  /** The dsh turn stopped reading (a Stop, an interrupt, or a failure). */
  abandon(turn: AcpTurn): void {
    if (this.turns.get(turn.threadId) === turn) this.turns.delete(turn.threadId)
    turn.settleOpen()
    if (turn.ended || this.stopping.has(turn.runId)) return
    const thread = this.options.engine.projection(turn.threadId).thread
    this.stopping.add(turn.runId)
    this.drivers.get(thread.providerInstanceId)?.interrupt(turn.threadId, turn.runId, 'interrupted')
  }

  finish(turn: AcpTurn): void {
    if (this.turns.get(turn.threadId) === turn) this.turns.delete(turn.threadId)
  }

  // ---- AcpRunObserver ----

  update(threadId: ThreadId, runId: RunId, update: Readonly<Record<string, unknown>>): void {
    const turn = this.turns.get(threadId)
    if (!turn || turn.runId !== runId) return
    switch (update.sessionUpdate) {
      case 'agent_message_chunk':
      case 'agent_thought_chunk': {
        const text = textOf(update.content)
        if (text === '') return
        turn.settleOpen()
        turn.push(update.sessionUpdate === 'agent_message_chunk' ? { kind: 'text', text } : { kind: 'reasoning', text })
        return
      }
      case 'tool_call':
      case 'tool_call_update': {
        const id = String(update.toolCallId)
        let tool = turn.tools.get(id)
        if (!tool) {
          if (update.sessionUpdate === 'tool_call_update' && typeof update.title !== 'string') return
          tool = { output: '', failed: false, settled: Promise.withResolvers<void>(), done: false }
          turn.tools.set(id, tool)
          turn.push({
            kind: 'tool',
            id,
            args: {
              title: typeof update.title === 'string' ? update.title : 'Tool call',
              kind: typeof update.kind === 'string' ? update.kind : null,
              ...(update.rawInput === undefined ? {} : { input: update.rawInput }),
              toolCallId: id,
            },
          })
        }
        const output = toolOutput(update)
        if (output !== null) tool.output = clip(output)
        if (update.status === 'failed') tool.failed = true
        if (update.status === 'completed' || update.status === 'failed') turn.settle(tool)
        return
      }
      default:
        return
    }
  }

  ended(threadId: ThreadId, runId: RunId, status: TerminalStatus, error: string | null): void {
    this.stopping.delete(runId)
    const turn = this.turns.get(threadId)
    if (!turn || turn.runId !== runId) return
    turn.ended = true
    turn.settleOpen()
    turn.push({ kind: 'end', status, error })
  }
}

/** The `t3-acp` route: each call streams the next segment of the thread's ACP prompt. */
class AcpSessionAdapter extends LlmAdapter {
  constructor(private readonly bridge: AcpSessionBridge) {
    super()
  }

  override providerInfo(provider: string) {
    return { id: provider, name: 'Native agents' }
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    const agent = this.bridge.agentConfig(model)
    return Promise.resolve({ provider, id: model, name: agent?.displayName ?? model })
  }

  override listModels(): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve(this.bridge.models())
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const threadId = this.bridge.threadOf(options.sessionId as string | undefined)
    if (threadId === undefined) {
      yield failure('This Session is not an orchestrator thread, so its ACP agent cannot be reached.')
      return
    }
    if (options.purpose !== undefined) {
      // Auxiliary calls (titles, compaction) never reach the agent.
      if (options.purpose === 'session-title') {
        yield* textChunks(this.bridge.title(threadId))
        yield { type: 'finish', reason: { kind: 'stop' } }
      } else {
        yield failure(`ACP agents do not serve ${String(options.purpose)} requests.`)
      }
      return
    }
    let turn: AcpTurn
    try { turn = this.bridge.turnFor(threadId) }
    catch (error) {
      this.bridge.setupFailed(threadId, error)
      throw error
    }
    let index = -1
    let open: 'text' | 'reasoning' | null = null
    let buffer = ''
    const close = function* (): Generator<StreamChunk> {
      if (open === null) return
      yield { type: 'block-end', index, block: { type: open, text: buffer } }
      open = null
      buffer = ''
    }
    try {
      for (;;) {
        const event = await turn.next(options.signal)
        if (event.kind === 'text' || event.kind === 'reasoning') {
          if (open !== event.kind) {
            yield* close()
            index += 1
            open = event.kind
            yield { type: 'block-start', index, blockType: event.kind }
          }
          buffer += event.text
          yield event.kind === 'text'
            ? { type: 'text-delta', index, text: event.text }
            : { type: 'reasoning-delta', index, text: event.text }
          continue
        }
        yield* close()
        if (event.kind === 'tool') {
          index += 1
          const id = ToolCallId(`acp-${turn.runId}-${event.id}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64))
          const argumentsJson = JSON.stringify(event.args)
          yield { type: 'block-start', index, blockType: 'tool-call' }
          yield { type: 'tool-call-delta', index, id, name: ACP_TOOL_NAME, argumentsDelta: argumentsJson }
          yield { type: 'block-end', index, block: { type: 'tool-call', id, name: ACP_TOOL_NAME, arguments: argumentsJson } }
          yield { type: 'finish', reason: { kind: 'tool-calls' } }
          return
        }
        this.bridge.finish(turn)
        if (event.status === 'completed') {
          yield { type: 'finish', reason: { kind: 'stop' } }
        } else if (event.status === 'failed') {
          yield failure(event.error ?? 'The ACP agent failed.')
        } else {
          yield {
            type: 'finish',
            reason: { kind: 'aborted', failure: { code: 'ABORTED', message: 'The ACP agent stopped.' } },
          }
        }
        return
      }
    } catch (error) {
      this.bridge.abandon(turn)
      throw error
    }
  }
}

function* textChunks(text: string): Generator<StreamChunk> {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
}

function failure(message: string): StreamChunk {
  return { type: 'finish', reason: { kind: 'error', failure: { code: 'PROVIDER', message } } }
}
