/**
 * Persistent native Codex app-server driver (stdio protocol 0.153.4).
 * Runtime policy and per-thread MCP overrides adapt T3 Tools Inc.'s MIT-licensed
 * CodexAdapterV2.ts @ 4c8eb1dfd5; see codex-PORTING.ts and THIRD_PARTY.md.
 */
import { createInterface } from 'node:readline'
import type { AcpAgentConfig, AcpDriverOptions, AcpProbe, AcpProcess, AcpSpawn } from './acp.ts'
import type { OrchestrationV2Run, RunId, RuntimeMode, ThreadId } from '../t3/contracts/index.ts'
import type { RunDriver } from './engine.ts'

type Obj = Record<string, unknown>
type Status = 'completed' | 'failed' | 'cancelled' | 'interrupted'
type Completion = { status: Status; error: string | null }
const object = (value: unknown): Obj => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Codex JSON object')
  return value as Obj
}
const nonempty = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) throw new Error('Missing Codex identifier')
  return value
}
const message = (error: unknown): string => error instanceof Error ? error.message : String(error)

/**
 * Same callbacks, timeouts, observer, and spawn ownership as AcpDriverOptions.
 * `bridge` is accepted but unused; Codex connects directly to the HTTP MCP endpoint.
 * Optional requestTimeoutMs defaults to 30 seconds and bounds RPC acknowledgements,
 * not model turns. Authentication and CODEX_HOME remain owned by the native CLI.
 */
export type CodexDriverOptions = Omit<AcpDriverOptions, 'bridge'> & {
  readonly bridge?: AcpDriverOptions['bridge']
  readonly requestTimeoutMs?: number
}

/** Unattended requests never grant additional command, filesystem, or network rights. */
function unattended(method: string, params: Obj): Obj | undefined {
  switch (method) {
    case 'item/commandExecution/requestApproval':
    case 'item/fileChange/requestApproval': {
      const choices = params.availableDecisions
      if (choices === undefined || choices === null) return { decision: 'decline' }
      if (Array.isArray(choices) && choices.includes('cancel')) return { decision: 'cancel' }
      if (Array.isArray(choices) && choices.includes('decline')) return { decision: 'decline' }
      throw new Error('Codex offered no unattended approval decision')
    }
    case 'item/permissions/requestApproval': return { permissions: {}, scope: 'turn' }
    case 'item/tool/requestUserInput': return { answers: {} }
    case 'mcpServer/elicitation/request': return { action: 'decline', content: null, _meta: null }
    default: return undefined
  }
}

class Peer {
  private next = 0
  private failure: Error | undefined
  private readonly pending = new Map<number, { resolve: (value: Obj) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>()
  private readonly lines
  constructor(readonly process: AcpProcess, private readonly notify: (method: string, params: Obj) => void,
    private readonly closed: (error: Error) => void, private readonly timeout: number) {
    this.lines = createInterface({ input: process.stdout })
    this.lines.on('line', (line) => {
      if (this.failure) return
      try {
        const frame = object(JSON.parse(line))
        if (typeof frame.method === 'string') {
          const params = frame.params === undefined ? {} : object(frame.params)
          if (typeof frame.id === 'number' || typeof frame.id === 'string') {
            const result = unattended(frame.method, params)
            this.send({ id: frame.id, ...(result === undefined
              ? { error: { code: -32601, message: 'Unsupported unattended Codex request' } } : { result }) })
          } else this.notify(frame.method, params)
        } else if (typeof frame.id === 'number') {
          const pending = this.pending.get(frame.id)
          if (!pending) return
          this.pending.delete(frame.id)
          clearTimeout(pending.timer)
          if (frame.error !== undefined) pending.reject(new Error(String(object(frame.error).message)))
          else {
            try { pending.resolve(object(frame.result)) }
            catch (error) { pending.reject(new Error(message(error))) }
          }
        } else throw new Error('Invalid Codex frame')
      } catch (error) { this.fail(new Error(`Codex protocol: ${message(error)}`)) }
    })
    this.lines.once('close', () => this.fail(new Error('Codex stdout closed')))
    process.stdin.on('error', this.onError)
    process.stdout.on('error', this.onError)
    process.stderr?.on('error', this.onError)
    process.stderr?.resume()
    void process.done.then(() => this.fail(new Error('Codex exited')), error => this.fail(new Error(`Codex exited: ${message(error)}`)))
  }
  private readonly onError = (error: Error): void => { this.fail(error) }
  send(value: Obj): void {
    if (this.failure) throw this.failure
    this.process.stdin.write(`${JSON.stringify(value)}\n`, (error) => { if (error) this.fail(error) })
  }
  request(method: string, params: Obj): Promise<Obj> {
    if (this.failure) return Promise.reject(this.failure)
    return new Promise((resolve, reject) => {
      const id = ++this.next
      const timer = setTimeout(() => this.fail(new Error(`Codex ${method} timed out`)), this.timeout)
      this.pending.set(id, { resolve, reject, timer })
      try { this.send({ id, method, params }) }
      catch (error) { this.fail(new Error(message(error))) }
    })
  }
  fail(error: Error): void {
    if (this.failure) return
    this.failure = error
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error) }
    this.pending.clear()
    this.closed(error)
  }
  async dispose(): Promise<void> {
    this.fail(new Error('Codex session closed'))
    this.lines.close()
    try { await this.process.dispose(); await this.process.done }
    finally {
      this.process.stdin.off('error', this.onError)
      this.process.stdout.off('error', this.onError)
      this.process.stderr?.off('error', this.onError)
    }
  }
}

// Adapted from T3 CodexAdapterV2.codexRuntimeModeTurnDefaults. Without an approval
// UI, Auto also uses the user reviewer and declines escalation (no automatic review).
function policy(mode: RuntimeMode, cwd: string): {
  approvalPolicy: string
  approvalsReviewer: string
  sandbox: string
  sandboxPolicy: Obj
} {
  const common = { approvalsReviewer: 'user' }
  if (mode === 'full-access') return { ...common, approvalPolicy: 'never', sandbox: 'danger-full-access', sandboxPolicy: { type: 'dangerFullAccess' } }
  if (mode === 'approval-required') return { ...common, approvalPolicy: 'untrusted', sandbox: 'read-only', sandboxPolicy: { type: 'readOnly', networkAccess: false } }
  return { ...common, approvalPolicy: 'on-request', sandbox: 'workspace-write', sandboxPolicy: {
    type: 'workspaceWrite', writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true,
  } }
}
const selectedModel = (model: string): Obj => model === 'default' || model === '' ? {} : { model }
const initialize = async (peer: Peer): Promise<Obj> => {
  const result = await peer.request('initialize', { clientInfo: { name: 'dsh-t3-orchestrator', version: '0.0.0' }, capabilities: {} })
  peer.send({ method: 'initialized' })
  return result
}

interface Operation {
  readonly runId: RunId
  readonly result: PromiseWithResolvers<Completion>
  readonly done: PromiseWithResolvers<void>
  readonly buffered: { method: string; params: Obj }[]
  readonly text: Map<string, string>
  intent?: 'cancelled' | 'interrupted'
  closed: boolean
  terminal: boolean
  turn?: string
  cancelTimer?: NodeJS.Timeout
}
interface Live {
  readonly peer: Peer
  readonly credential: string
  native: string | null
  active?: Operation
  idle?: NodeJS.Timeout
  closing?: Promise<void>
}

/**
 * One live native process/thread per orchestration thread; engine nativeId enables
 * resume after idle teardown. Failed resumes fail visibly rather than losing history.
 * close/dispose await startup, run settlement and process exit. Observers receive ACP
 * text/tool updates after engine ingestion; observer failures are logged and contained.
 */
export class CodexRunDriver implements RunDriver {
  readonly canSteer = false
  private readonly live = new Map<string, Live>()
  private readonly operations = new Map<string, Operation>()
  private readonly closing = new Set<Promise<void>>()
  private disposed = false
  constructor(private readonly options: CodexDriverOptions) {}
  steer(): boolean { return false }
  /**
   * @param threadId Orchestration thread to inspect.
   * @returns Whether the driver owns an initializing or reusable native process.
   */
  isLive(threadId: string): boolean { return this.live.has(threadId) }
  startRun(threadId: ThreadId, run: OrchestrationV2Run, prompt: string): void {
    if (this.operations.has(threadId)) throw new Error('Codex thread already has an active run')
    const operation: Operation = {
      runId: run.id, result: Promise.withResolvers(), done: Promise.withResolvers(),
      buffered: [], text: new Map(), closed: false, terminal: false,
    }
    this.operations.set(threadId, operation)
    void this.execute(threadId, run, prompt, operation).catch(error => this.options.log?.(`Codex run settlement failed: ${message(error)}`))
  }
  private observe(action: () => void): void {
    try { action() } catch (error) { this.options.log?.(`Codex observer failed: ${message(error)}`) }
  }
  private async open(threadId: ThreadId, run: OrchestrationV2Run, operation: Operation): Promise<Live> {
    const o = this.options, projection = o.engine.projection(threadId), thread = projection.thread
    const cwd = thread.worktreePath ?? String(thread.projectId)
    const credential = await o.issueCredential({ threadId, providerInstanceId: o.agent.id, subagent: thread.lineage.relationshipToParent === 'subagent' })
    if (operation.closed || this.disposed || operation.intent) {
      o.revokeCredential(credential.providerSessionId)
      throw new Error('Codex startup stopped')
    }
    let session: Live | undefined
    try {
      const process = o.spawn([o.agent.command, ...o.agent.args, 'app-server'], cwd, o.agent.env ?? {})
      const peer = new Peer(process, (method, params) => {
        if (session) this.notification(threadId, session, method, params)
      }, (error) => {
        if (!session) return
        session.active?.result.resolve({ status: 'failed', error: error.message })
        void this.closeSession(threadId, session).catch(cause => o.log?.(`Codex cleanup failed: ${message(cause)}`))
      }, o.requestTimeoutMs ?? 30_000)
      session = { peer, credential: credential.providerSessionId, native: null, active: operation }
      this.live.set(threadId, session)
      await initialize(peer)
      const previous = projection.providerThreads.find(value => value.id === thread.activeProviderThreadId)?.nativeThreadRef
      const resume = !run.freshContext && previous?.driver === 'codex' ? previous.nativeId : null
      const { sandboxPolicy: _sandboxPolicy, ...permissions } = policy(thread.runtimeMode, cwd)
      // Adapted from T3 CodexAdapterV2.codexThreadRuntimeParams (MIT).
      const params = { cwd, ...selectedModel(run.modelSelection.model), ...permissions, config: {
        [`mcp_servers.${o.serverKey}`]: { url: credential.endpoint, http_headers: { Authorization: credential.authorizationHeader }, tool_timeout_sec: 65 * 60 },
      } }
      const response = await peer.request(resume ? 'thread/resume' : 'thread/start', {
        ...params, ...(resume ? { threadId: resume } : { ephemeral: false }),
      })
      session.native = nonempty(object(response.thread).id)
      return session
    } catch (error) {
      if (session) await this.closeSession(threadId, session)
      else o.revokeCredential(credential.providerSessionId)
      throw error
    }
  }
  private async execute(threadId: ThreadId, run: OrchestrationV2Run, prompt: string, operation: Operation): Promise<void> {
    let session: Live | undefined
    let completion: Completion = { status: 'failed', error: 'Codex run did not start' }
    try {
      if (this.disposed || operation.closed) throw new Error('Codex driver closed')
      const old = this.live.get(threadId)
      if (old && run.freshContext) await this.closeSession(threadId, old)
      if (operation.intent || operation.closed) throw new Error('Codex run stopped')
      session = this.live.get(threadId) ?? await this.open(threadId, run, operation)
      if (session.idle) clearTimeout(session.idle)
      session.active = operation
      if (operation.closed) throw new Error('Codex run closed')
      this.options.touch(threadId)
      this.options.engine.runStarted(threadId, run.id, {
        nativeThreadId: nonempty(session.native), ...selectedModel(run.modelSelection.model),
      })
      if (!operation.intent) {
        const thread = this.options.engine.projection(threadId).thread
        const cwd = thread.worktreePath ?? String(thread.projectId)
        const { sandbox: _sandbox, ...permissions } = policy(thread.runtimeMode, cwd)
        const effort = run.modelSelection.options?.find(option => option.id === 'reasoningEffort')?.value
        const serviceTier = run.modelSelection.options?.find(option => option.id === 'serviceTier')?.value
        const response = await session.peer.request('turn/start', {
          threadId: session.native, cwd, ...selectedModel(run.modelSelection.model), ...permissions,
          input: [{ type: 'text', text: prompt }], summary: 'detailed',
          ...(typeof effort === 'string' ? { effort } : {}), ...(typeof serviceTier === 'string' ? { serviceTier } : {}),
        })
        operation.turn = nonempty(object(response.turn).id)
        for (const event of operation.buffered.splice(0)) this.notification(threadId, session, event.method, event.params)
        if (operation.intent) this.sendInterrupt(threadId, session, operation)
        completion = await operation.result.promise
        if (session.closing) await session.closing
      } else completion = { status: operation.intent, error: null }
    } catch (error) {
      completion = { status: 'failed', error: message(error) }
      if (session) await this.closeSession(threadId, session)
    } finally {
      if (operation.cancelTimer) clearTimeout(operation.cancelTimer)
      operation.terminal = true
      if (session?.active === operation) delete session.active
      this.operations.delete(threadId)
      // Engine.runEnded synchronously starts queued runs, so release this operation first.
      if (session && this.live.get(threadId) === session) {
        const idleSession = session
        session.idle = setTimeout(() => {
          void this.closeSession(threadId, idleSession).catch(error => this.options.log?.(message(error)))
        }, this.options.idleTimeoutMs)
        session.idle.unref()
      }
      try {
        const status = operation.intent ?? completion.status
        const error = operation.intent ? null : completion.error
        this.options.engine.runEnded(threadId, run.id, status, error)
        this.observe(() => this.options.observer?.ended(threadId, run.id, status, error))
      } finally { operation.done.resolve() }
    }
  }
  private notification(threadId: ThreadId, session: Live, method: string, params: Obj): void {
    const operation = session.active
    if (!operation || operation.terminal || params.threadId !== session.native) return
    if (!operation.turn) { operation.buffered.push({ method, params }); return }
    const turn = method === 'turn/completed' || method === 'turn/started' ? object(params.turn) : undefined
    if ((turn?.id ?? params.turnId) !== operation.turn) return
    this.options.touch(threadId)
    if (method === 'turn/completed') {
      const status = turn?.status
      if (status !== 'completed' && status !== 'failed' && status !== 'interrupted') throw new Error('Invalid Codex terminal status')
      operation.terminal = true
      const error = turn?.error == null ? null : object(turn.error).message
      operation.result.resolve({ status, error: typeof error === 'string' ? error : null })
      return
    }
    const item = (method === 'item/started' || method === 'item/completed') ? object(params.item) : undefined
    const thought = method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta'
    if (method === 'item/agentMessage/delta' || thought) {
      if (typeof params.delta !== 'string') throw new Error('Invalid Codex text delta')
      this.append(threadId, operation, nonempty(params.itemId), thought, params.delta)
    } else if (item?.type === 'agentMessage' && method === 'item/completed') {
      const id = nonempty(item.id)
      if (!operation.text.has(`${id}:false`) && typeof item.text === 'string') this.append(threadId, operation, id, false, item.text)
    } else if (item && ['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'webSearch', 'imageGeneration'].includes(String(item.type))) {
      const id = nonempty(item.id), complete = method === 'item/completed'
      const status = complete ? (['failed', 'declined', 'interrupted'].includes(String(item.status)) || item.error != null ? 'failed' : 'completed') : 'running'
      const title = typeof item.command === 'string' ? item.command : typeof item.tool === 'string' ? item.tool : String(item.type)
      this.options.engine.toolCall(threadId, operation.runId, `${operation.runId}:tool:${id}`, {
        title, toolName: String(item.type), status, ...(complete ? { output: item } : { input: item }),
      })
      this.observe(() => this.options.observer?.update(threadId, operation.runId, {
        sessionUpdate: complete ? 'tool_call_update' : 'tool_call', toolCallId: id, title, kind: item.type, status,
        ...(complete ? { rawOutput: item } : { rawInput: item }),
      }))
    }
  }
  private append(threadId: ThreadId, operation: Operation, itemId: string, thought: boolean, delta: string): void {
    const key = `${itemId}:${thought}`
    operation.text.set(key, (operation.text.get(key) ?? '') + delta)
    this.options.engine.appendText(threadId, operation.runId, thought ? 'reasoning' : 'assistant_message', delta, `${operation.runId}:${key}`)
    this.observe(() => this.options.observer?.update(threadId, operation.runId, {
      sessionUpdate: thought ? 'agent_thought_chunk' : 'agent_message_chunk', content: { type: 'text', text: delta },
    }))
  }
  interrupt(threadId: ThreadId, runId: RunId, intent: 'cancelled' | 'interrupted'): void {
    const operation = this.operations.get(threadId)
    if (!operation || operation.runId !== runId || operation.terminal) return
    operation.intent = intent
    const session = this.live.get(threadId)
    if (session && operation.turn) this.sendInterrupt(threadId, session, operation)
    if (!operation.cancelTimer) operation.cancelTimer = setTimeout(() => { void this.close(threadId, 'cancel grace elapsed').catch(error => this.options.log?.(message(error))) }, this.options.cancelGraceMs)
  }
  private sendInterrupt(threadId: ThreadId, session: Live, operation: Operation): void {
    if (operation.terminal) return
    void session.peer.request('turn/interrupt', { threadId: session.native, turnId: operation.turn }).catch((error) => {
      operation.result.resolve({ status: 'failed', error: message(error) })
      void this.closeSession(threadId, session).catch(cause => this.options.log?.(message(cause)))
    })
  }
  private closeSession(threadId: string, session: Live): Promise<void> {
    if (session.closing) return session.closing
    if (this.live.get(threadId) === session) this.live.delete(threadId)
    if (session.idle) clearTimeout(session.idle)
    session.active?.result.resolve({ status: 'failed', error: 'Codex session closed' })
    // Assign before Peer.dispose calls its close callback.
    session.closing = Promise.resolve().then(async () => {
      try { await session.peer.dispose() }
      finally { this.options.revokeCredential(session.credential) }
    })
    const closing = session.closing
    this.closing.add(closing)
    void closing.then(() => this.closing.delete(closing), () => this.closing.delete(closing))
    return closing
  }
  /**
   * Close a native process, retaining its engine nativeId for later resume.
   * @param threadId Orchestration thread to close, including an in-flight startup.
   * @param _reason Caller diagnostic; it does not alter the native teardown protocol.
   * @returns Settlement after its run ends and owned process exits.
   */
  async close(threadId: string, _reason: string): Promise<void> {
    const operation = this.operations.get(threadId)
    if (operation) operation.closed = true
    const session = this.live.get(threadId)
    if (session) await this.closeSession(threadId, session)
    await operation?.done.promise
  }
  /** @returns Settlement after all startup, run and process teardown work finishes. */
  async dispose(): Promise<void> {
    this.disposed = true
    await Promise.all([...new Set([...this.live.keys(), ...this.operations.keys()])].map(id => this.close(id, 'dispose')))
    await Promise.all([...this.closing])
  }
}

/**
 * Probe native account and model availability without login, refresh, or model turns.
 * @param agent Native executable/arguments/environment (driver and bridge are ignored).
 * @param spawn Process owner; dispose must terminate and await its child.
 * @param cwd Working directory for the native process.
 * @param timeoutMs Maximum time for each read-only protocol request.
 * @returns ACP-compatible availability facts; a clearly logged-out account is unavailable.
 */
export async function probeCodexAgent(agent: AcpAgentConfig, spawn: AcpSpawn, cwd: string, timeoutMs: number): Promise<AcpProbe> {
  let peer: Peer | undefined
  const result = { ok: false, stage: 'spawn', agentName: 'Codex', agentVersion: null, authMethods: [], authRequired: false,
    loadSession: true, httpMcp: true, models: [], currentModel: null, error: null } as {
    -readonly [K in keyof AcpProbe]: AcpProbe[K]
  }
  try {
    peer = new Peer(spawn([agent.command, ...agent.args, 'app-server'], cwd, agent.env ?? {}), () => {}, () => {}, timeoutMs)
    result.stage = 'initialize'
    const initialized = await initialize(peer)
    if (typeof initialized.userAgent === 'string') result.agentVersion = initialized.userAgent
    result.stage = 'session'
    const account = await peer.request('account/read', { refreshToken: false })
    if (account.requiresOpenaiAuth === true && account.account === null) {
      result.authRequired = true
      result.error = 'Codex requires native authentication. Sign in with the configured Codex CLI.'
      return result
    }
    const models: { id: string; label?: string }[] = []
    let cursor: string | null = null
    const cursors = new Set<string>()
    do {
      const page = await peer.request('model/list', { cursor, limit: 100 })
      if (!Array.isArray(page.data)) throw new Error('Codex returned invalid model list')
      for (const entry of page.data) {
        const model = object(entry), id = nonempty(model.model)
        models.push({ id, ...(typeof model.displayName === 'string' ? { label: model.displayName } : {}) })
        if (model.isDefault === true) result.currentModel = id
      }
      cursor = page.nextCursor == null ? null : nonempty(page.nextCursor)
      if (cursor && cursors.has(cursor)) throw new Error('Codex repeated model cursor')
      if (cursor) cursors.add(cursor)
    } while (cursor)
    result.models = models
    result.ok = true
    result.stage = 'ready'
  } catch (error) { result.error = message(error) }
  finally { if (peer) await peer.dispose() }
  return result
}
