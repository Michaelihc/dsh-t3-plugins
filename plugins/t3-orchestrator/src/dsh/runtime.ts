/**
 * Composition root. Implements the dsh boundary services T3's lifted MCP code
 * depends on (V2 orchestrator primitives, receipts, settings, environment,
 * providers, projects, git, launch, remote delegation), builds T3's layers
 * (McpSessionRegistry, ThreadManagementService, OrchestratorMcpService, the
 * HTTP MCP transport and an in-process McpServer), and serves `/mcp` on a
 * loopback port with NodeHttpServer, as T3's server does.
 */
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as NodeCrypto from '@effect/platform-node/NodeCrypto'
import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer'
import type { Context as CordisContext } from '@deepseek-ai/cordis'
import type * as Context from 'effect/Context'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as NetAddress from 'effect/net/NetAddress'
import { McpSchema, McpServer } from 'effect/ai'
import { HttpRouter, HttpServer } from 'effect/http'
import {
  CommandId,
  DEFAULT_SERVER_SETTINGS,
  ServerSettings as ServerSettingsSchema,
  EnvironmentId,
  GitCommandError,
  MessageId,
  type OrchestrationV2ServerCommand,
  ProjectId,
  type ProviderInteractionMode,
  ProviderInstanceId,
  type RuntimeMode,
  ThreadId,
} from '../t3/contracts/index.ts'
import * as ServerEnvironment from '../t3/environment/ServerEnvironment.ts'
import * as McpHttpServer from '../t3/mcp/McpHttpServer.ts'
import * as McpInvocationContext from '../t3/mcp/McpInvocationContext.ts'
import * as McpSessionRegistry from '../t3/mcp/McpSessionRegistry.ts'
import * as CommandReceiptStore from '../t3/orchestration-v2/CommandReceiptStore.ts'
import * as Orchestrator from '../t3/orchestration-v2/Orchestrator.ts'
import * as ProviderAdapterRegistry from '../t3/orchestration-v2/ProviderAdapterRegistry.ts'
import * as ThreadLaunchService from '../t3/orchestration-v2/ThreadLaunchService.ts'
import * as ThreadManagementService from '../t3/orchestration-v2/ThreadManagementService.ts'
import { linkedEnvironmentsOff } from '../t3/peer/PeerForwarding.ts'
import * as RemoteDelegation from '../t3/peer/RemoteDelegation.ts'
import * as ProjectService from '../t3/project/ProjectService.ts'
import * as ProviderRegistry from '../t3/provider/ProviderRegistry.ts'
import * as ServerSettings from '../t3/serverSettings.ts'
import * as GitVcsDriver from '../t3/vcs/GitVcsDriver.ts'
import { AcpRunDriver, type AcpAgentConfig, type AcpDriverOptions, type AcpSpawn } from './acp.ts'
import { CodexRunDriver } from './codex.ts'
import { AcpSessionBridge } from './acp-session.ts'
import { DshOrchestratorEngine, type EngineBackend, type RunDriver } from './engine.ts'
import { EXTERNAL_DRIVER, ProviderCatalog } from './providers.ts'
import { DSH_PROVIDER_INSTANCE_ID, DshSessionDriver } from './session.ts'

export interface OrchestratorConfig {
  /** MCP server key agents see; tool names are T3's. */
  readonly serverKey: string
  /** Interface the loopback MCP endpoint listens on. */
  readonly host: string
  /** Port of the MCP endpoint; 0 picks a free port. */
  readonly port: number
  /** T3's McpSessionRegistry idle window: how long a session credential stays valid, in milliseconds. */
  readonly livenessWindowMs: number
  /** How long an idle ACP agent process is kept before it is stopped, in milliseconds. */
  readonly idleTimeoutMs: number
  /** How long a cancelled agent run may take to stop before it is killed, in milliseconds. */
  readonly cancelGraceMs: number
  /** How long a capability probe of one ACP agent may take, in milliseconds. */
  readonly probeTimeoutMs: number
  /** How long a capability probe result is reused, in milliseconds. */
  readonly probeTtlMs: number
  /** How dsh-native Sessions act as threads; ACP permission requests are answered by the same mode. */
  readonly runtimeMode: 'approval-required' | 'auto-accept-edits' | 'auto' | 'full-access'
  /** Whether dsh-native threads start in the default or plan interaction mode. */
  readonly interactionMode: 'default' | 'plan'
  /** Route for dsh Sessions this plugin creates. */
  readonly dshAgentOptions: {
    /** Provider id of the route. */
    readonly provider?: string
    /** Model id of the route. */
    readonly model?: string
  }
  /** Register the tools natively for dsh Sessions as `mcp__<serverKey>__<tool>`. */
  readonly nativeTools: boolean
  /** Intact-item historical-context budget; defaults to T3's 16,000-token cap. */
  readonly handoffTokenCap?: number
  /** Where `isolation: "worktree"` checkouts go. */
  readonly worktreeRoot: string
  /** This Host's environment id in thread links. */
  readonly environmentId: string
  /** ACP coding agents that threads can run on. */
  readonly agents: readonly AcpAgentConfig[]
}

export interface OrchestratorDeps {
  /** The Cordis context; dsh-native threads need its `agents` registry. */
  readonly ctx: CordisContext | undefined
  readonly backend: EngineBackend
  readonly spawn: AcpSpawn
  readonly config: OrchestratorConfig
  readonly log?: (message: string, error?: unknown) => void
}

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** How agents start T3's stdio bridge: the built entry, or the source under Node's type stripping. */
export function bridgeCommand(): { command: string; args: string[] } {
  const built = join(PACKAGE_ROOT, 'lib', 'bridge.js')
  return { command: process.execPath, args: [existsSync(built) ? built : join(PACKAGE_ROOT, 'src', 'bridge-main.ts')] }
}

/** `git worktree add` from the parent commit, as T3 prepares an isolated child checkout. */
function createWorktree(root: string) {
  return (input: { readonly projectRoot: string; readonly baseRef: string; readonly name: string }) => {
    mkdirSync(root, { recursive: true })
    const path = join(root, input.name.replace(/[^A-Za-z0-9_-]/g, '-'))
    execFileSync('git', ['-C', input.projectRoot, 'worktree', 'add', '--detach', path, input.baseRef], { stdio: 'pipe' })
    return path
  }
}

/** Run `f` with a service from the context. */
const useService = <I, S, A, E, R>(
  tag: Context.Key<I, S>,
  f: (service: S) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | I> =>
  Effect.gen(function* () {
    return yield* f(yield* tag)
  })

/** The client identity in-process calls present, as T3's in-process tests do. */
const IN_PROCESS_CLIENT = McpSchema.McpServerClient.of({
  clientId: 0,
  clientCapabilities: {},
  clientInfo: { name: 'dsh-native', version: '0.0.0' },
  protocolVersion: '2025-06-18',
  initializePayload: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dsh-native', version: '0.0.0' } },
  getClient: Effect.die('unused'),
})

export class OrchestratorRuntime {
  readonly engine: DshOrchestratorEngine
  readonly catalog: ProviderCatalog
  readonly acp = new Map<string, AcpRunDriver | CodexRunDriver>()
  readonly dsh: DshSessionDriver | undefined
  /** Backs ACP threads with dsh Sessions when the Host has an agent registry. */
  readonly acpSessions: AcpSessionBridge | undefined
  readonly environmentId: EnvironmentId
  private runtime!: ManagedRuntime.ManagedRuntime<
    | McpSessionRegistry.McpSessionRegistry
    | McpServer.McpServer
    | ThreadManagementService.ThreadManagementService
    | HttpServer.HttpServer,
    unknown
  >
  endpoint = ''

  constructor(private readonly deps: OrchestratorDeps) {
    const { config } = deps
    this.environmentId = EnvironmentId.make(config.environmentId)
    const dshAvailable = deps.ctx?.get('agents') !== undefined
    this.catalog = new ProviderCatalog({
      agents: config.agents,
      spawn: deps.spawn,
      probeCwd: () => process.cwd(),
      probeTimeoutMs: config.probeTimeoutMs,
      probeTtlMs: config.probeTtlMs,
      dshAvailable,
      dshModel: config.dshAgentOptions.model,
    })
    this.engine = new DshOrchestratorEngine({
      backend: deps.backend,
      driverFor: instanceId => this.driverFor(instanceId),
      driverKindOf: instanceId => this.catalog.driverKindOf(instanceId),
      createWorktree: createWorktree(config.worktreeRoot),
      log: message => deps.log?.(message),
    })
    this.dsh =
      deps.ctx && dshAvailable
        ? new DshSessionDriver({
          ctx: deps.ctx,
          engine: this.engine,
          runtimeMode: config.runtimeMode,
          interactionMode: config.interactionMode,
          agentOptions: config.dshAgentOptions,
          serverKey: config.serverKey,
        })
        : undefined
    const dsh = this.dsh
    this.acpSessions =
      deps.ctx && dsh
        ? new AcpSessionBridge({ ctx: deps.ctx, engine: this.engine, agents: config.agents,
          ensureThread: agent => dsh.ensureThread(agent),
          ...(config.handoffTokenCap === undefined ? {} : { handoffTokenCap: config.handoffTokenCap }),
        })
        : undefined
    for (const agent of config.agents) {
      const driverOptions: AcpDriverOptions = {
        engine: this.engine,
        agent,
        spawn: deps.spawn,
        serverKey: config.serverKey,
        bridge: bridgeCommand(),
        issueCredential: input =>
          this.run(
            useService(McpSessionRegistry.McpSessionRegistry, registry =>
              registry.issue({
                threadId: input.threadId,
                providerInstanceId: ProviderInstanceId.make(input.providerInstanceId),
                browserToolsAvailable: false,
                subagent: input.subagent,
              }),
            ),
          ).then(issued => issued.config),
        revokeCredential: (providerSessionId) => {
          void this.run(
            useService(McpSessionRegistry.McpSessionRegistry, registry => registry.revokeProviderSession(providerSessionId)),
          )
        },
        touch: (threadId) => {
          void this.run(useService(McpSessionRegistry.McpSessionRegistry, registry => registry.touch(threadId)))
        },
        idleTimeoutMs: config.idleTimeoutMs,
        cancelGraceMs: config.cancelGraceMs,
        log: message => deps.log?.(message),
        ...(this.acpSessions ? { observer: this.acpSessions } : {}),
      }
      const driver = agent.driver === 'codex' ? new CodexRunDriver(driverOptions) : new AcpRunDriver(driverOptions)
      this.acp.set(agent.id, driver)
      this.acpSessions?.attach(agent.id, driver)
    }
    // T3 wakes any parent with a delegated completion; outside MCP clients have no provider to wake.
    this.engine.wakeParent = (parentThreadId, text, completion) => {
      const projection = this.engine.projection(parentThreadId)
      const driver = this.driverFor(projection.thread.providerInstanceId)
      if (!driver) return false
      const active = projection.runs.filter(run => run.status === 'running').at(-1)
      const command: OrchestrationV2ServerCommand = {
        type: 'message.dispatch',
        commandId: CommandId.make(
          `command:delegated-completion:${parentThreadId}:${completion.parentRunId}:${completion.generation}`,
        ),
        threadId: parentThreadId,
        messageId: MessageId.make(
          `message:delegated-completion:${parentThreadId}:${completion.parentRunId}:${completion.generation}`,
        ),
        text,
        attachments: [],
        createdBy: 'system',
        creationSource: 'server',
        delegatedCompletion: {
          parentRunId: completion.parentRunId,
          generation: completion.generation,
          taskIds: [...completion.taskIds],
        },
        dispatchMode:
          active !== undefined && driver.canSteer
            ? { type: 'steer_active', targetRunId: active.id }
            : { type: 'queue_after_active' },
      } as OrchestrationV2ServerCommand
      try {
        this.engine.dispatch(command)
        return true
      } catch (error) {
        deps.log?.('delegated completion delivery failed', error)
        return false
      }
    }
  }

  private driverFor(instanceId: string): RunDriver | undefined {
    if (instanceId === DSH_PROVIDER_INSTANCE_ID) return this.dsh
    if (this.acpSessions && this.acp.has(instanceId)) return this.acpSessions.forAgent(instanceId)
    return this.acp.get(instanceId)
  }

  private run<A, E>(
    effect: Effect.Effect<
      A,
      E,
      | McpSessionRegistry.McpSessionRegistry
      | McpServer.McpServer
      | ThreadManagementService.ThreadManagementService
      | HttpServer.HttpServer
    >,
  ): Promise<A> {
    return this.runtime.runPromise(effect)
  }

  /** The dsh boundary services. */
  private boundaryLayer() {
    const { engine, catalog, deps } = this
    const environmentId = this.environmentId
    const orchestrator = Orchestrator.OrchestratorV2.of({
      delegatedTaskResultPending: (childThreadId, taskId) =>
        Effect.try({
          try: () => engine.delegatedTaskResultPending(childThreadId, taskId),
          catch: cause => new Orchestrator.OrchestratorProjectionError({ threadId: childThreadId, cause }),
        }),
      restartContinuationPending: () => Effect.succeed(false),
      awaitRestartContinuation: () => Effect.void,
      dispatch: command =>
        Effect.try({
          try: () => engine.dispatch(command),
          catch: cause =>
            cause instanceof Orchestrator.OrchestratorDispatchError || cause instanceof Orchestrator.OrchestratorProjectionError
              ? cause
              : new Orchestrator.OrchestratorDispatchError({ commandId: command.commandId, commandType: command.type, cause }),
        }),
      getTimelinePage: (threadId, options) =>
        Effect.try({
          try: () => engine.timelinePage(threadId, options),
          catch: cause => new Orchestrator.OrchestratorProjectionError({ threadId, cause }),
        }),
      getThreadRecords: (threadId, fields, filter) =>
        Effect.try({
          try: () => engine.getThreadRecords(threadId, fields, filter),
          catch: cause =>
            cause instanceof Orchestrator.OrchestratorProjectionError
              ? cause
              : new Orchestrator.OrchestratorProjectionError({ threadId, cause }),
        }),
      listAppOwnedChildThreadIds: threadId =>
        Effect.try({
          try: () => engine.appOwnedChildThreadIds(threadId),
          catch: cause => new Orchestrator.OrchestratorProjectionError({ threadId, cause }),
        }),
      getThreadProjection: threadId =>
        Effect.try({
          try: () => engine.projection(threadId) as never,
          catch: cause => new Orchestrator.OrchestratorProjectionError({ threadId, cause }),
        }),
      getShellSnapshot: options => Effect.sync(() => engine.shellSnapshot(options)),
      getThreadShell: threadId => Effect.sync(() => engine.shell(threadId)),
      getThreadEventSequence: () => Effect.sync(() => engine.currentSequence),
      streamStoredEventsFrom: (input = {}) =>
        Stream.callback(queue =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const matches = (stored: {
                readonly sequence: number
                readonly event: { readonly type: string; readonly threadId: string }
              }) =>
                (input.eventType === undefined || stored.event.type === input.eventType) &&
                (input.threadId === undefined || stored.event.threadId === input.threadId)
              for (const stored of engine.storedEventsAfter(input.threadId, input.afterSequence ?? 0)) {
                if (matches(stored)) Queue.offerUnsafe(queue, stored)
              }
              return engine.onStoredEvent((stored) => {
                if (stored.sequence > (input.afterSequence ?? 0) && matches(stored)) Queue.offerUnsafe(queue, stored)
              })
            }),
            dispose => Effect.sync(dispose),
          ),
        ),
    })
    // T3 reads instance enablement from its settings file; dsh's configured agents and dsh itself are its instances.
    const serverSettings = Schema.decodeUnknownSync(ServerSettingsSchema)({
      ...Schema.encodeSync(ServerSettingsSchema)(DEFAULT_SERVER_SETTINGS),
      providerInstances: Object.fromEntries([
        ...catalog.adapterIds().map(instanceId => [instanceId, { driver: catalog.driverKindOf(instanceId), enabled: true }]),
        ['external', { driver: 'external', enabled: true }],
      ]),
    })
    const settings = ServerSettings.ServerSettingsService.of({ getSettings: Effect.succeed(serverSettings) })
    const receipts = CommandReceiptStore.CommandReceiptStoreV2.of({
      getByCommandId: commandId =>
        Effect.sync(() =>
          engine.hasReceipt(commandId)
            ? Option.some({
              commandId,
              threadId: ThreadId.make('receipt'),
              commandType: 'unknown',
              acceptedAt: DateTime.nowUnsafe(),
              resultSequence: 0,
              status: 'accepted' as const,
              error: null,
            })
            : Option.none(),
        ),
    })
    const providers = ProviderRegistry.ProviderRegistry.of({
      getProviders: Effect.promise(() => catalog.providers()),
      refreshInstance: instanceId => Effect.promise(() => catalog.providers(instanceId)),
    })
    const adapters = ProviderAdapterRegistry.ProviderAdapterRegistryV2.of({ list: () => Effect.sync(() => catalog.adapterIds()) })
    const projects = ProjectService.ProjectService.of({
      getById: projectId =>
        Effect.sync(() => {
          const at = new Date().toISOString() as never
          return Option.some({
            id: projectId,
            title: String(projectId).split(/[\\/]/).filter(Boolean).at(-1) ?? String(projectId),
            workspaceRoot: String(projectId),
            defaultModelSelection: null,
            scripts: [],
            createdAt: at,
            updatedAt: at,
            deletedAt: null,
          })
        }),
    })
    const git = GitVcsDriver.GitVcsDriver.of({
      resolveCommit: input =>
        Effect.try({
          try: () => ({
            commitSha: execFileSync('git', ['-C', input.cwd, 'rev-parse', '--verify', `${input.revision}^{commit}`], {
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
            }).trim(),
          }),
          catch: () =>
            new GitCommandError({
              operation: 'resolveCommit',
              command: 'git rev-parse',
              cwd: input.cwd,
              detail: 'git rev-parse failed',
            } as never),
        }),
    })
    // Isolated checkouts are created with the child thread (engine.createWorktree), so nothing remains to prepare.
    const launch = ThreadLaunchService.ThreadLaunchService.of({ prepareRun: () => Effect.void })
    const remote = RemoteDelegation.RemoteDelegation.of({
      delegate: () => Effect.fail(linkedEnvironmentsOff),
      cancel: () => Effect.fail(linkedEnvironmentsOff),
    })
    const environment = Effect.succeed(environmentId)
    void deps
    return Layer.mergeAll(
      Layer.succeed(Orchestrator.OrchestratorV2, orchestrator),
      Layer.succeed(ServerSettings.ServerSettingsService, settings),
      Layer.succeed(CommandReceiptStore.CommandReceiptStoreV2, receipts),
      Layer.succeed(ProviderRegistry.ProviderRegistry, providers),
      Layer.succeed(ProviderAdapterRegistry.ProviderAdapterRegistryV2, adapters),
      Layer.succeed(ProjectService.ProjectService, projects),
      Layer.succeed(GitVcsDriver.GitVcsDriver, git),
      Layer.succeed(ThreadLaunchService.ThreadLaunchService, launch),
      Layer.succeed(RemoteDelegation.RemoteDelegation, remote),
      Layer.succeed(
        ServerEnvironment.ServerEnvironment,
        ServerEnvironment.ServerEnvironment.of({ getEnvironmentId: environment }),
      ),
      Layer.succeed(
        ServerEnvironment.ServerEnvironmentIdentity,
        ServerEnvironment.ServerEnvironmentIdentity.of({ getEnvironmentId: environment }),
      ),
      NodeCrypto.layerSecureRandom,
      NodeCrypto.layerDigest,
    )
  }

  async start(): Promise<void> {
    const { config } = this.deps
    const boundary = this.boundaryLayer()
    const http = NodeHttpServer.layer(createServer, { host: config.host, port: config.port })
    const registry = McpSessionRegistry.layer
    const threads = ThreadManagementService.layer
    const app = Layer.mergeAll(
      HttpRouter.serve(McpHttpServer.layer, { disableListenLog: true, disableLogger: true }),
      McpHttpServer.layerOrchestratorToolkit.pipe(Layer.provideMerge(McpHttpServer.layerInProcessMcpServer)),
    ).pipe(Layer.provideMerge(registry), Layer.provideMerge(threads), Layer.provideMerge(http), Layer.provideMerge(boundary))
    this.runtime = ManagedRuntime.make(app as never)
    const server = await this.run(useService(HttpServer.HttpServer, service => Effect.succeed(service)))
    const address = server.address
    // As T3's McpSessionRegistry computes the endpoint it hands out.
    this.endpoint = NetAddress.isInetAddress(address)
      ? `http://${NetAddress.isUnspecified(address.address) ? '127.0.0.1' : NetAddress.formatUrlHostString(NetAddress.formatIp(address.address))}:${address.port}/mcp`
      : ''
  }

  /** T3's tools as the in-process McpServer advertises them (names, descriptions, schemas, annotations). */
  async listTools(): Promise<ReadonlyArray<McpSchema.Tool>> {
    return await this.run(useService(McpServer.McpServer, server => Effect.succeed(server.tools.map(entry => entry.tool))))
  }

  /** The scope a dsh Session acts with when it calls a native tool. */
  dshScope(threadId: ThreadId, sessionId: string): McpInvocationContext.McpInvocationScope {
    const thread = this.engine.projection(threadId).thread
    return {
      environmentId: this.environmentId,
      requestNamespace: `dsh-session-${sessionId}`,
      thread: {
        threadId,
        providerSessionId: `dsh-session-${sessionId}`,
        providerInstanceId: DSH_PROVIDER_INSTANCE_ID,
        subagent: thread.lineage.relationshipToParent === 'subagent',
      },
      client: undefined,
      capabilities: new Set(['orchestration', 'worktree', 'pull-requests']),
      issuedAt: Date.now(),
      linkedEnvironments: false,
    }
  }

  /** Call a T3 tool in process with a scope, as T3's in-process McpServer calls do. */
  async callTool(scope: McpInvocationContext.McpInvocationScope, name: string, args: unknown): Promise<McpSchema.CallToolResult> {
    return (await this.run(
      useService(McpServer.McpServer, server =>
        server
          .callTool({ name, arguments: (args ?? {}) as Record<string, unknown> })
          .pipe(
            Effect.provideService(McpInvocationContext.McpInvocationContext, scope),
            Effect.provideService(McpSchema.McpServerClient, IN_PROCESS_CLIENT),
          ),
      ) as never,
    )) as McpSchema.CallToolResult
  }

  /**
   * A parent thread for an outside MCP client (a script). Its one run stays
   * active, so it may delegate, until `close()` ends it and revokes the token.
   */
  async openExternalParent(options: {
    readonly cwd: string
    readonly title?: string
    readonly runtimeMode?: RuntimeMode
    readonly interactionMode?: ProviderInteractionMode
  }): Promise<{
    readonly threadId: ThreadId
    readonly endpoint: string
    readonly authorizationHeader: string
    close(): Promise<void>
  }> {
    const { config } = this.deps
    const threadId = ThreadId.make(`external-${randomUUID()}`)
    const instance = ProviderInstanceId.make('external')
    const at = DateTime.nowUnsafe()
    this.engine.registerThread({
      createdBy: 'user',
      creationSource: 'server',
      id: threadId,
      projectId: ProjectId.make(options.cwd),
      title: options.title ?? 'External MCP client',
      providerInstanceId: instance,
      modelSelection: { instanceId: instance, model: 'external' },
      runtimeMode: options.runtimeMode ?? config.runtimeMode,
      interactionMode: options.interactionMode ?? config.interactionMode,
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
    } as never)
    const runId = this.engine.beginExternalRun(threadId, {
      messageId: MessageId.make(`message:${randomUUID()}`),
      text: 'External MCP client session',
      createdBy: 'user',
    })
    const issued = await this.run(
      useService(McpSessionRegistry.McpSessionRegistry, registry =>
        registry.issue({
          threadId,
          providerInstanceId: instance,
          browserToolsAvailable: false,
        }),
      ),
    )
    return {
      threadId,
      endpoint: issued.config.endpoint,
      authorizationHeader: issued.config.authorizationHeader,
      close: async () => {
        this.engine.runEnded(threadId, runId, 'completed', null)
        await this.run(
          useService(McpSessionRegistry.McpSessionRegistry, registry =>
            registry.revokeProviderSession(issued.config.providerSessionId),
          ),
        )
      },
    }
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.acp.values()].map(driver => driver.dispose()))
    await this.runtime?.dispose()
    this.engine.flush()
  }
}

export { EXTERNAL_DRIVER }
