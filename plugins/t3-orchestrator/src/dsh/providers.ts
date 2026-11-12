/**
 * Provider snapshots for T3's ProviderRegistry boundary. Each configured ACP
 * agent is a provider instance of driver `acpRegistry`, probed the way T3's
 * ACP Registry driver probes (initialize, then a disposable session/new; never
 * `authenticate`). dsh itself is the instance `dsh`. T3's lifted
 * `providerConstraints` and `listCapabilityModels` turn these into what
 * `orchestrator_capabilities` reports.
 */
import {
  type ProviderDriverKind,
  ProviderDriverKind as ProviderDriverKindSchema,
  ProviderInstanceId,
  type ServerProvider,
} from '../t3/contracts/index.ts'
import { probeAcpAgent, type AcpAgentConfig, type AcpProbe, type AcpSpawn } from './acp.ts'
import { DSH_PROVIDER_INSTANCE_ID } from './session.ts'
import { probeCodexAgent } from './codex.ts'

export const ACP_DRIVER = ProviderDriverKindSchema.make('acpRegistry')
export const DSH_DRIVER = ProviderDriverKindSchema.make('dsh')
export const EXTERNAL_DRIVER = ProviderDriverKindSchema.make('external')

export interface ProviderCatalogOptions {
  readonly agents: readonly AcpAgentConfig[]
  readonly spawn: AcpSpawn
  readonly probeCwd: () => string
  readonly probeTimeoutMs: number
  readonly probeTtlMs: number
  readonly dshAvailable: boolean
  readonly dshModel: string | undefined
}

export class ProviderCatalog {
  /** The probe in flight or last started, per agent. */
  private readonly probes = new Map<string, { seq: number; probe: Promise<AcpProbe> }>()
  /** The last finished probe, per agent, with when it started. */
  private readonly results = new Map<string, { seq: number; at: number; result: AcpProbe }>()
  private started = 0

  constructor(private readonly options: ProviderCatalogOptions) {}

  driverKindOf(instanceId: string): ProviderDriverKind {
    if (instanceId === DSH_PROVIDER_INSTANCE_ID) return DSH_DRIVER
    const agent = this.options.agents.find(agent => agent.id === instanceId)
    if (agent) return agent.driver === 'codex' ? ProviderDriverKindSchema.make('codex') : ACP_DRIVER
    return EXTERNAL_DRIVER
  }

  /** Instance ids with an orchestration adapter (ProviderAdapterRegistryV2.list). */
  adapterIds(): ProviderInstanceId[] {
    return [
      ...(this.options.dshAvailable ? [DSH_PROVIDER_INSTANCE_ID] : []),
      ...this.options.agents.map(agent => ProviderInstanceId.make(agent.id)),
    ]
  }

  private start(agent: AcpAgentConfig): Promise<AcpProbe> {
    const at = Date.now()
    const seq = ++this.started
    const probe = (agent.driver === 'codex' ? probeCodexAgent : probeAcpAgent)(agent, this.options.spawn, this.options.probeCwd(), this.options.probeTimeoutMs)
    this.probes.set(agent.id, { seq, probe })
    void probe.then((result) => {
      if ((this.results.get(agent.id)?.seq ?? 0) < seq) this.results.set(agent.id, { seq, at, result })
    }, () => {})
    return probe
  }

  /**
   * An agent's snapshot without waiting on it when an earlier one exists: a
   * finished probe is reused, and once older than `probeTtlMs` it is refreshed
   * in the background. Only an agent that has never finished a probe, or the
   * one a caller refreshes, is waited for, so a delegation does not block on
   * probing unrelated agents.
   */
  private probe(agent: AcpAgentConfig, force = false): Promise<AcpProbe> {
    const inFlight = this.probes.get(agent.id)
    if (force) return this.start(agent)
    const last = this.results.get(agent.id)
    if (last) {
      const refreshing = inFlight !== undefined && inFlight.seq > last.seq
      if (!refreshing && Date.now() - last.at >= this.options.probeTtlMs) void this.start(agent)
      return Promise.resolve(last.result)
    }
    return inFlight?.probe ?? this.start(agent)
  }

  async providers(refresh?: string): Promise<ServerProvider[]> {
    const checkedAt = new Date().toISOString()
    const dsh: ServerProvider = {
      instanceId: DSH_PROVIDER_INSTANCE_ID,
      driver: DSH_DRIVER,
      displayName: 'DeepSeek Harness',
      enabled: true,
      installed: this.options.dshAvailable,
      version: null,
      status: this.options.dshAvailable ? 'ready' : 'error',
      auth: { status: 'unknown' },
      checkedAt,
      ...(this.options.dshAvailable
        ? {}
        : { availability: 'unavailable' as const, unavailableReason: 'The dsh agent registry is not mounted.' }),
      models: this.options.dshModel
        ? [{ slug: this.options.dshModel, name: this.options.dshModel, isCustom: false, capabilities: null }]
        : [],
      slashCommands: [],
      skills: [],
    } as ServerProvider
    const agents = await Promise.all(
      this.options.agents.map(async (agent): Promise<ServerProvider> => {
        const probe = await this.probe(agent, refresh === agent.id)
        const installed = probe.stage !== 'spawn'
        return {
          instanceId: ProviderInstanceId.make(agent.id),
          driver: this.driverKindOf(agent.id),
          displayName: agent.displayName ?? probe.agentName ?? agent.id,
          enabled: true,
          installed,
          version: probe.agentVersion,
          status: probe.ok ? 'ready' : 'error',
          auth: { status: probe.ok ? 'authenticated' : probe.authRequired ? 'unauthenticated' : 'unknown' },
          checkedAt,
          ...(probe.ok
            ? {}
            : {
              message: `${probe.stage === 'session' ? 'Native session initialization failed' : `Native ${probe.stage} failed`}${probe.authMethods.length ? ` (auth methods: ${probe.authMethods.join(', ')})` : ''}: ${(probe.error ?? 'unknown error').slice(0, 300)}`,
            }),
          ...(installed
            ? {}
            : {
              availability: 'unavailable' as const,
              unavailableReason: `Provider executable could not start: ${(probe.error ?? '').slice(0, 300)}`,
            }),
          nativeSessions: { canList: false, canLoad: probe.loadSession, canResume: agent.driver === 'codex' && probe.loadSession },
          models: probe.models.map(model => ({
            slug: model.id,
            name: model.label ?? model.id,
            isCustom: false,
            ...(model.id === probe.currentModel ? { isDefault: true } : {}),
            capabilities: null,
          })),
          slashCommands: [],
          skills: [],
        } as ServerProvider
      }),
    )
    return [dsh, ...agents]
  }
}
