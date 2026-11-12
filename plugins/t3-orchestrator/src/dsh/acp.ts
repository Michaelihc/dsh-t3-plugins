/**
 * Runs engine runs on ACP agents. One live ACP process and session per thread
 * while it has work. A follow-up reuses the live session, else loads the old
 * one (`session/load`) when the agent supports it, else starts a new session
 * with a portable transcript, as T3's ACP adapter falls back to portable
 * context. `freshContext` always starts a new session without history.
 *
 * MCP injection follows T3 Code's ACP adapter (packages/provider-acp/src/server/adapter.ts
 * `acpMcpContext` and AcpSessionRuntime.ts `sessionMcpServers` @ 4c8eb1dfd5, MIT, Copyright
 * (c) 2026 T3 Tools Inc.): HTTP when the agent advertises `mcpCapabilities.http`, otherwise
 * the stdio bridge with T3's `T3_ACP_MCP_*` environment. See THIRD_PARTY.md and PORTING.md.
 */
import { Readable as NodeReadable, Writable as NodeWritable, type Readable, type Writable } from 'node:stream'
import { client as createAcpClientApp, methods, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import type { McpProviderSessionConfig } from '../t3/provider-core/mcpSession.ts'
import type { OrchestrationV2Run, RunId, ThreadId } from '../t3/contracts/index.ts'
import type { DshOrchestratorEngine, RunDriver } from './engine.ts'
import { permissionDecision, type PermissionToolCall } from './permissions.ts'

/** One configured ACP agent: a provider instance of driver `acpRegistry`. */
export interface AcpAgentConfig {
  /** Provider instance id threads name in `delegate_task`, for example `kimi-code`. */
  readonly id: string
  /** Native transport; omission selects ACP. Codex uses its own app-server protocol. */
  readonly driver?: 'acp' | 'codex'
  /** Name shown for the agent; defaults to the id. */
  readonly displayName?: string
  /** Executable that speaks ACP over stdio. */
  readonly command: string
  /** Arguments passed to the executable. */
  readonly args: readonly string[]
  /** Extra environment variables for the agent process. */
  readonly env?: Readonly<Record<string, string>>
  /** `auto` uses HTTP when the agent advertises it, else the stdio bridge. */
  readonly mcpTransport?: 'auto' | 'http' | 'stdio'
}

export interface AcpProcess {
  readonly stdin: Writable
  readonly stdout: Readable
  readonly stderr?: Readable
  /** Settles when the process exits. */
  readonly done: Promise<unknown>
  dispose(): Promise<void>
}
export type AcpSpawn = (argv: readonly string[], cwd: string, env: Readonly<Record<string, string>>) => AcpProcess

export interface AcpDriverOptions {
  readonly engine: DshOrchestratorEngine
  readonly agent: AcpAgentConfig
  readonly spawn: AcpSpawn
  readonly serverKey: string
  /** How the agent starts the stdio bridge (T3's `acp-mcp-bridge`). */
  readonly bridge: { readonly command: string; readonly args: readonly string[] }
  /** Issue a provider-session credential (T3's McpSessionRegistry.issue). */
  readonly issueCredential: (input: {
    readonly threadId: ThreadId
    readonly providerInstanceId: string
    readonly subagent: boolean
  }) => Promise<McpProviderSessionConfig>
  /** Revoke it when the provider session ends (McpSessionRegistry.revokeProviderSession). */
  readonly revokeCredential: (providerSessionId: string) => void
  /** Trusted liveness for a thread's credentials (McpSessionRegistry.touch). */
  readonly touch: (threadId: ThreadId) => void
  readonly idleTimeoutMs: number
  readonly cancelGraceMs: number
  readonly log?: (message: string) => void
  /** Sees each run's raw ACP updates and its end, after the engine has recorded them. */
  readonly observer?: AcpRunObserver
}

/** A listener on the ACP traffic of the run a thread is executing. */
export interface AcpRunObserver {
  update(threadId: ThreadId, runId: RunId, update: Readonly<Record<string, unknown>>): void
  ended(threadId: ThreadId, runId: RunId, status: 'completed' | 'failed' | 'interrupted' | 'cancelled', error: string | null): void
}

/** What `initialize` and a disposable `session/new` revealed about an agent. */
export interface AcpProbe {
  readonly ok: boolean
  readonly stage: 'spawn' | 'initialize' | 'session' | 'ready'
  readonly agentName: string | null
  readonly agentVersion: string | null
  readonly authMethods: readonly string[]
  readonly authRequired: boolean
  readonly loadSession: boolean
  readonly httpMcp: boolean
  readonly models: readonly { id: string; label?: string }[]
  readonly currentModel: string | null
  readonly error: string | null
}

interface LiveSession {
  readonly process: AcpProcess
  readonly connection: ReturnType<ReturnType<typeof createAcpClientApp>['connect']>
  readonly sessionId: string
  readonly credential: McpProviderSessionConfig
  readonly loadSession: boolean
  replaying: boolean
  activeRunId: RunId | null
  cancelIntent: 'interrupted' | 'cancelled' | null
  /** Key of the text item currently streaming, per kind. */
  streaming: Map<'assistant_message' | 'reasoning', string>
  chunk: number
  idleTimer: NodeJS.Timeout | null
  exited: boolean
  stderrTail: string
  currentModel: string | null
  readonly ended: PromiseWithResolvers<never>
}

const STDERR_TAIL = 4_000

const textOf = (content: unknown): string => {
  if (content === null || typeof content !== 'object') return ''
  const block = content as { type?: unknown; text?: unknown }
  return block.type === 'text' && typeof block.text === 'string' ? block.text : ''
}

const errorText = (error: unknown): string => {
  const data = error !== null && typeof error === 'object' && 'data' in error ? (error as { data: unknown }).data : undefined
  const detail = data === undefined || data === null ? '' : `: ${typeof data === 'string' ? data : JSON.stringify(data)}`
  if (error instanceof Error) return `${error.message}${detail}`
  if (error !== null && typeof error === 'object' && 'message' in error)
    return `${String((error as { message: unknown }).message)}${detail}`
  return String(error)
}

const isAuthRequired = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && (error as { code: unknown }).code === -32000

/** Models from the stable config-option form or the older `models` field. */
function advertisedModels(session: unknown): {
  models: { id: string; label?: string }[]
  current: string | null
  configId: string | null
} {
  const record = (session ?? {}) as Record<string, unknown>
  const options = Array.isArray(record.configOptions) ? (record.configOptions as Record<string, unknown>[]) : []
  const modelOption = options.find(option => option.category === 'model' || option.id === 'model')
  if (modelOption && Array.isArray(modelOption.options)) {
    const models = (modelOption.options as Record<string, unknown>[]).flatMap(entry =>
      typeof entry.value === 'string'
        ? [{ id: entry.value, ...(typeof entry.name === 'string' && entry.name !== entry.value ? { label: entry.name } : {}) }]
        : [],
    )
    return {
      models,
      current: typeof modelOption.currentValue === 'string' ? modelOption.currentValue : null,
      configId: String(modelOption.id),
    }
  }
  const legacy = record.models as { availableModels?: Record<string, unknown>[]; currentModelId?: unknown } | undefined
  const models = (legacy?.availableModels ?? []).flatMap(entry =>
    typeof entry.modelId === 'string'
      ? [{ id: entry.modelId, ...(typeof entry.name === 'string' && entry.name !== entry.modelId ? { label: entry.name } : {}) }]
      : [],
  )
  return { models, current: typeof legacy?.currentModelId === 'string' ? legacy.currentModelId : null, configId: null }
}

export class AcpRunDriver implements RunDriver {
  readonly canSteer = false
  private readonly live = new Map<string, LiveSession>()
  private readonly earlyCancels = new Map<string, 'interrupted' | 'cancelled'>()
  private disposed = false

  constructor(private readonly options: AcpDriverOptions) {}

  startRun(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): void {
    void this.execute(threadId, run, prompt)
  }

  steer(): boolean {
    return false
  }

  interrupt(threadId: ThreadId, runId: RunId, intent: 'interrupted' | 'cancelled'): void {
    const session = this.live.get(threadId)
    if (!session || session.activeRunId !== runId) {
      // Still starting: the run ends as soon as its session opens.
      this.earlyCancels.set(runId, intent)
      return
    }
    session.cancelIntent = intent
    void session.connection.agent.notify(methods.agent.session.cancel, { sessionId: session.sessionId }).catch(() => {})
    // An agent that ignores session/cancel still stops: its process is torn down.
    setTimeout(() => {
      if (session.activeRunId === runId && !session.exited) void this.close(threadId, 'cancel grace elapsed')
    }, this.options.cancelGraceMs).unref()
  }

  isLive(threadId: string): boolean {
    return this.live.has(threadId)
  }

  async dispose(): Promise<void> {
    this.disposed = true
    await Promise.all([...this.live.keys()].map(threadId => this.close(threadId, 'host shutting down')))
  }

  private async execute(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): Promise<void> {
    const { engine } = this.options
    let session: LiveSession | undefined
    try {
      const fresh = run.freshContext === true
      const reusable = this.live.get(threadId)
      if (reusable && fresh) await this.close(threadId, 'fresh context requested')
      const opened = !fresh && reusable ? { session: reusable, transfer: false } : await this.open(threadId, run, fresh)
      session = opened.session
      const early = this.earlyCancels.get(run.id)
      if (early) {
        this.ended(threadId, run.id, early, null)
        return
      }
      if (session.idleTimer) clearTimeout(session.idleTimer)
      session.idleTimer = null
      session.activeRunId = run.id
      session.cancelIntent = null
      session.streaming.clear()
      this.options.touch(threadId)
      engine.runStarted(threadId, run.id, {
        ...(session.currentModel ? { model: session.currentModel } : {}),
        nativeThreadId: session.sessionId,
      })
      const text = opened.transfer ? this.portableContext(threadId, run.id) + prompt : prompt
      const response = await Promise.race([
        session.connection.agent.request(methods.agent.session.prompt, {
          sessionId: session.sessionId,
          prompt: [{ type: 'text', text }],
        }),
        session.ended.promise,
      ])
      const stopReason = (response as { stopReason?: string }).stopReason
      if (stopReason === 'cancelled') this.ended(threadId, run.id, session.cancelIntent ?? 'interrupted', null)
      else if (stopReason === 'refusal') this.ended(threadId, run.id, 'failed', 'The agent refused the request.')
      else this.ended(threadId, run.id, 'completed', null)
    } catch (error) {
      const intent = session?.cancelIntent ?? this.earlyCancels.get(run.id)
      if (intent) this.ended(threadId, run.id, intent, null)
      else {
        const tail = session?.stderrTail.trim()
        this.ended(threadId, run.id, 'failed', `${errorText(error)}${tail ? `\n${tail.slice(-1_000)}` : ''}`)
      }
    } finally {
      this.earlyCancels.delete(run.id)
      if (session) {
        session.activeRunId = null
        session.cancelIntent = null
        if (!session.exited) this.armIdle(threadId, session)
      }
    }
  }

  private ended(
    threadId: ThreadId,
    runId: RunId,
    status: 'completed' | 'failed' | 'interrupted' | 'cancelled',
    error: string | null,
  ): void {
    this.options.engine.runEnded(threadId, runId, status, error)
    this.options.observer?.ended(threadId, runId, status, error)
  }

  private armIdle(threadId: ThreadId, session: LiveSession): void {
    if (session.idleTimer) clearTimeout(session.idleTimer)
    session.idleTimer = setTimeout(() => {
      const busy = this.options.engine
        .projection(threadId)
        .runs.some(run => run.status === 'queued' || run.status === 'starting' || run.status === 'running')
      if (!busy) void this.close(threadId, 'idle')
    }, this.options.idleTimeoutMs)
    session.idleTimer.unref()
  }

  /** The thread's earlier messages, for an agent that cannot reload its old session. */
  private portableContext(threadId: ThreadId, currentRunId: RunId): string {
    const projection = this.options.engine.projection(threadId)
    const freshFrom = projection.runs
      .filter(run => run.freshContext === true && run.id !== currentRunId)
      .toSorted((a, b) => b.ordinal - a.ordinal)[0]
    const lines = projection.messages
      .filter(message => message.runId !== currentRunId && message.role !== 'system' && message.text.trim() !== '')
      .filter((message) => {
        const run = projection.runs.find(candidate => candidate.id === message.runId)
        return freshFrom === undefined || (run !== undefined && run.ordinal >= freshFrom.ordinal)
      })
      .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
    if (lines.length === 0) return ''
    return `This conversation continues from an earlier session that is no longer available. Its transcript:\n\n${lines.join('\n\n')}\n\nThe new message follows.\n\n`
  }

  private async open(
    threadId: ThreadId,
    run: OrchestrationV2Run,
    fresh: boolean,
  ): Promise<{ session: LiveSession; transfer: boolean }> {
    const { engine, agent } = this.options
    if (this.disposed) throw new Error('The orchestrator is shutting down.')
    const projection = engine.projection(threadId)
    const thread = projection.thread
    const cwd = thread.worktreePath ?? String(thread.projectId)
    const proc = this.options.spawn([agent.command, ...agent.args], cwd, agent.env ?? {})
    const holder: { session: LiveSession | undefined } = { session: undefined }
    // What each tool call announced; a permission request may carry only its id.
    const announced = new Map<string, PermissionToolCall>()
    let stderrTail = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL)
      if (holder.session) holder.session.stderrTail = stderrTail
    })
    const connection = createAcpClientApp({ name: 'dsh-t3-orchestrator' })
      .onNotification(methods.client.session.update, ({ params }) => {
        const session = holder.session
        if (session && !session.replaying) {
          rememberToolCall(announced, params.update as unknown as Record<string, unknown>)
          this.onUpdate(threadId, session, params.update as unknown as Record<string, unknown>)
        }
        return Promise.resolve()
      })
      .onRequest(methods.client.session.requestPermission, ({ params }) => {
        const mode = engine.projection(threadId).thread.runtimeMode
        const earlier = announced.get(params.toolCall.toolCallId)
        const request = params.toolCall as PermissionToolCall
        const decision = permissionDecision(
          mode,
          {
            kind: request.kind ?? earlier?.kind ?? null,
            locations: request.locations ?? earlier?.locations ?? null,
            rawInput: request.rawInput ?? earlier?.rawInput,
          },
          { workspace: cwd },
        )
        const option = params.options.find(candidate =>
          decision === 'allow'
            ? candidate.kind === 'allow_once' || candidate.kind === 'allow_always'
            : candidate.kind === 'reject_once' || candidate.kind === 'reject_always',
        )
        return Promise.resolve(
          option
            ? { outcome: { outcome: 'selected' as const, optionId: option.optionId } }
            : { outcome: { outcome: 'cancelled' as const } },
        )
      })
      .connect(
        ndJsonStream(
          NodeWritable.toWeb(proc.stdin) as WritableStream<Uint8Array>,
          NodeReadable.toWeb(proc.stdout) as ReadableStream<Uint8Array>,
        ),
      )
    let credential: McpProviderSessionConfig | undefined
    try {
      const init = await connection.agent.request(methods.agent.initialize, {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
        clientInfo: { name: 'dsh-t3-orchestrator', version: '0.0.0' },
      })
      const caps = (init as { agentCapabilities?: { loadSession?: boolean; mcpCapabilities?: { http?: boolean } } })
        .agentCapabilities
      const loadSession = caps?.loadSession === true
      credential = await this.options.issueCredential({
        threadId,
        providerInstanceId: agent.id,
        subagent: thread.lineage.relationshipToParent === 'subagent',
      })
      const mcpServers = this.mcpServers(caps?.mcpCapabilities?.http === true, credential)
      const base = {
        process: proc,
        connection,
        credential,
        loadSession,
        replaying: false,
        activeRunId: null,
        cancelIntent: null,
        streaming: new Map(),
        chunk: 0,
        idleTimer: null,
        exited: false,
        stderrTail,
        currentModel: null,
        ended: endedSignal(),
      } satisfies Omit<LiveSession, 'sessionId'>
      const previous =
        projection.providerThreads.find(candidate => candidate.id === thread.activeProviderThreadId)?.nativeThreadRef?.nativeId ??
        null
      const hasHistory = projection.messages.some(message => message.role === 'user' && message.runId !== run.id)
      let response: unknown
      if (!fresh && previous && loadSession) {
        holder.session = { ...base, sessionId: previous, replaying: true }
        try {
          response = await connection.agent.request(methods.agent.session.load, { sessionId: previous, cwd, mcpServers })
          holder.session.replaying = false
        } catch (error) {
          this.options.log?.(`session/load failed for ${threadId}, starting a new session: ${errorText(error)}`)
          holder.session = undefined
        }
      }
      let transfer = false
      if (!holder.session) {
        const created = await connection.agent.request(methods.agent.session.new, { cwd, mcpServers })
        response = created
        const sessionId = (created as { sessionId?: unknown }).sessionId
        if (typeof sessionId !== 'string') throw new Error('ACP session/new returned no session id')
        holder.session = { ...base, sessionId }
        transfer = !fresh && hasHistory
      }
      const session = holder.session
      session.currentModel = await this.selectModel(session, response, run.modelSelection.model)
      if (thread.interactionMode === 'plan') await this.selectPlanMode(session, response)
      this.live.set(threadId, session)
      void proc.done.finally(() => this.onExit(threadId, session))
      void connection.closed.finally(() => this.onExit(threadId, session))
      return { session, transfer }
    } catch (error) {
      if (credential) this.options.revokeCredential(credential.providerSessionId)
      connection.close()
      await proc.dispose().catch(() => {})
      const tail = stderrTail.trim()
      throw new Error(`ACP agent ${agent.id} failed to start: ${errorText(error)}${tail ? `\n${tail.slice(-1_000)}` : ''}`)
    }
  }

  /** As T3's acpMcpContext/sessionMcpServers: HTTP when advertised, else the stdio bridge. */
  private mcpServers(httpMcp: boolean, credential: McpProviderSessionConfig) {
    const transport = this.options.agent.mcpTransport ?? 'auto'
    if (transport === 'http' || (transport === 'auto' && httpMcp)) {
      return [
        {
          type: 'http' as const,
          name: this.options.serverKey,
          url: credential.endpoint,
          headers: [{ name: 'Authorization', value: credential.authorizationHeader }],
        },
      ]
    }
    return [
      {
        name: this.options.serverKey,
        command: this.options.bridge.command,
        args: [...this.options.bridge.args],
        env: [
          { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
          { name: 'T3_ACP_MCP_ENDPOINT', value: credential.endpoint },
          { name: 'T3_ACP_MCP_AUTHORIZATION', value: credential.authorizationHeader },
        ],
      },
    ]
  }

  private async selectModel(session: LiveSession, response: unknown, wanted: string): Promise<string | null> {
    const advertised = advertisedModels(response)
    if (!wanted || wanted === advertised.current || !advertised.models.some(model => model.id === wanted))
      return advertised.current
    try {
      if (advertised.configId !== null) {
        const params = { sessionId: session.sessionId, configId: advertised.configId, value: wanted }
        await session.connection.agent.request(methods.agent.session.setConfigOption, params as never)
      } else {
        await session.connection.agent.request('session/set_model', { sessionId: session.sessionId, modelId: wanted })
      }
      return wanted
    } catch (error) {
      this.options.log?.(`could not select model ${wanted}: ${errorText(error)}`)
      return advertised.current
    }
  }

  private async selectPlanMode(session: LiveSession, response: unknown): Promise<void> {
    const modes = (response as { modes?: { availableModes?: { id: string }[] } }).modes?.availableModes ?? []
    const plan = modes.find(mode => mode.id === 'plan')
    if (!plan) return
    await session.connection.agent
      .request(methods.agent.session.setMode, { sessionId: session.sessionId, modeId: plan.id })
      .catch(() => {})
  }

  private onExit(threadId: string, session: LiveSession): void {
    if (session.exited) return
    session.exited = true
    session.ended.reject(
      new Error(`ACP agent process ended${session.stderrTail.trim() ? `: ${session.stderrTail.trim().slice(-500)}` : ''}`),
    )
    if (session.idleTimer) clearTimeout(session.idleTimer)
    this.options.revokeCredential(session.credential.providerSessionId)
    if (this.live.get(threadId) === session) this.live.delete(threadId)
    session.connection.close()
  }

  /** End a live session; its credential is revoked with it. */
  async close(threadId: string, reason: string): Promise<void> {
    const session = this.live.get(threadId)
    if (!session) return
    this.options.log?.(`closing ACP session for ${threadId}: ${reason}`)
    this.onExit(threadId, session)
    await session.process.dispose().catch(() => {})
  }

  private onUpdate(threadId: ThreadId, session: LiveSession, update: Record<string, unknown>): void {
    const runId = session.activeRunId
    if (runId === null) return
    this.record(threadId, session, runId, update.sessionUpdate, update)
    this.options.observer?.update(threadId, runId, update)
  }

  private record(
    threadId: ThreadId,
    session: LiveSession,
    runId: RunId,
    kind: unknown,
    update: Record<string, unknown>,
  ): void {
    const { engine } = this.options
    const appendText = (type: 'assistant_message' | 'reasoning', text: string) => {
      if (text === '') return
      const other = type === 'assistant_message' ? 'reasoning' : 'assistant_message'
      session.streaming.delete(other)
      let key = session.streaming.get(type)
      if (key === undefined) {
        session.chunk += 1
        key = `${runId}:${type}:${session.chunk}`
        session.streaming.set(type, key)
      }
      engine.appendText(threadId, runId, type, text, key)
    }
    switch (kind) {
      case 'agent_message_chunk':
        appendText('assistant_message', textOf(update.content))
        return
      case 'agent_thought_chunk':
        appendText('reasoning', textOf(update.content))
        return
      case 'tool_call':
        session.streaming.clear()
        engine.toolCall(threadId, runId, `${runId}:tool:${String(update.toolCallId)}`, {
          title: typeof update.title === 'string' ? update.title : null,
          toolName: typeof update.kind === 'string' ? update.kind : null,
          input: update.rawInput ?? null,
          status: toolStatus(update.status),
        })
        return
      case 'tool_call_update':
        engine.toolCall(threadId, runId, `${runId}:tool:${String(update.toolCallId)}`, {
          ...(typeof update.title === 'string' ? { title: update.title } : {}),
          ...(update.rawOutput === undefined ? {} : { output: update.rawOutput }),
          ...(update.status === undefined || update.status === null ? {} : { status: toolStatus(update.status) }),
        })
        return
      default:
        return
    }
  }
}

/** Keep the kind, locations and input a live tool call announced; forget it once it ends. */
function rememberToolCall(announced: Map<string, PermissionToolCall>, update: Record<string, unknown>): void {
  if (update.sessionUpdate !== 'tool_call' && update.sessionUpdate !== 'tool_call_update') return
  const id = update.toolCallId
  if (typeof id !== 'string') return
  if (update.status === 'completed' || update.status === 'failed') {
    announced.delete(id)
    return
  }
  const earlier = update.sessionUpdate === 'tool_call' ? undefined : announced.get(id)
  announced.set(id, {
    kind: typeof update.kind === 'string' ? update.kind : earlier?.kind ?? null,
    locations: Array.isArray(update.locations) ? (update.locations as { path?: unknown }[]) : earlier?.locations ?? null,
    rawInput: update.rawInput ?? earlier?.rawInput,
  })
}

function endedSignal(): PromiseWithResolvers<never> {
  const ended = Promise.withResolvers<never>()
  ended.promise.catch(() => {})
  return ended
}

function toolStatus(status: unknown): 'pending' | 'running' | 'completed' | 'failed' {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'pending':
      return 'pending'
    default:
      return 'running'
  }
}

/**
 * Probe an agent without signing in: `initialize`, then a disposable
 * `session/new`, whose success is the authentication-readiness proof, as in
 * T3's ACP Registry provider snapshot. `authenticate` is never called.
 */
export async function probeAcpAgent(agent: AcpAgentConfig, spawn: AcpSpawn, cwd: string, timeoutMs: number): Promise<AcpProbe> {
  const result: { -readonly [K in keyof AcpProbe]: AcpProbe[K] } = {
    ok: false,
    stage: 'spawn',
    agentName: null,
    agentVersion: null,
    authMethods: [],
    authRequired: false,
    loadSession: false,
    httpMcp: false,
    models: [],
    currentModel: null,
    error: null,
  }
  let proc: AcpProcess
  try {
    proc = spawn([agent.command, ...agent.args], cwd, agent.env ?? {})
  } catch (error) {
    result.error = errorText(error)
    return result
  }
  let stderr = ''
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf8')).slice(-STDERR_TAIL)
  })
  const connection = createAcpClientApp({ name: 'dsh-t3-orchestrator-probe' })
    .onNotification(methods.client.session.update, () => Promise.resolve())
    .onRequest(methods.client.session.requestPermission, () => Promise.resolve({ outcome: { outcome: 'cancelled' as const } }))
    .connect(
      ndJsonStream(
        NodeWritable.toWeb(proc.stdin) as WritableStream<Uint8Array>,
        NodeReadable.toWeb(proc.stdout) as ReadableStream<Uint8Array>,
      ),
    )
  result.stage = 'initialize'
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms at ${result.stage}`)), timeoutMs)
    timer.unref()
    void proc.done.finally(() => clearTimeout(timer))
  })
  const exited = proc.done.then(() => {
    throw new Error(`process exited during ${result.stage}`)
  })
  exited.catch(() => {})
  try {
    const init = (await Promise.race([
      connection.agent.request(methods.agent.initialize, {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
        clientInfo: { name: 'dsh-t3-orchestrator', version: '0.0.0' },
      }),
      timeout,
      exited,
    ])) as Record<string, unknown>
    const caps = (init.agentCapabilities ?? {}) as { loadSession?: boolean; mcpCapabilities?: { http?: boolean } }
    const info = init.agentInfo as { name?: string; title?: string; version?: string } | undefined
    result.agentName = info?.title ?? info?.name ?? null
    result.agentVersion = info?.version ?? null
    result.authMethods = Array.isArray(init.authMethods)
      ? (init.authMethods as { id?: string; name?: string }[]).map(method => method.id ?? method.name ?? '?')
      : []
    result.loadSession = caps.loadSession === true
    result.httpMcp = caps.mcpCapabilities?.http === true
    result.stage = 'session'
    const session = await Promise.race([
      connection.agent.request(methods.agent.session.new, { cwd, mcpServers: [] }),
      timeout,
      exited,
    ])
    const advertised = advertisedModels(session)
    result.models = advertised.models
    result.currentModel = advertised.current
    result.stage = 'ready'
    result.ok = true
  } catch (error) {
    result.authRequired = result.stage === 'session' && (isAuthRequired(error) || /auth/i.test(errorText(error)))
    const tail = stderr.trim().split(/\r?\n/).slice(-3).join(' | ')
    result.error = `${errorText(error)}${tail ? ` (stderr: ${tail.slice(-400)})` : ''}`
  } finally {
    connection.close()
    await proc.dispose().catch(() => {})
  }
  return result
}
