/**
 * Experimental T3 Code orchestrator MCP for DeepSeek Harness. T3's MCP layer
 * (contracts, toolkit, handlers, tool access, invocation context, credential
 * registry, HTTP transport, stdio bridge, OrchestratorMcpService and
 * ThreadManagementService) is lifted from T3 Code (src/t3, PORTING.md); this
 * file and src/dsh are the dsh boundary: a V2 orchestrator over dsh Sessions
 * and ACP agents, and the Cordis plugin.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type {} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-agent'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z as zod } from 'zod'
import type { AcpProcess, AcpSpawn } from './dsh/acp.ts'
import type { EngineBackend } from './dsh/engine.ts'
import { OrchestratorRuntime, type OrchestratorConfig } from './dsh/runtime.ts'
import { createThreadDirectory } from './dsh/threads.ts'
import { detectAgents } from './dsh/detect.ts'
import { ThreadId } from './t3/contracts/index.ts'
import { DEFAULT_HANDOFF_TOKEN_CAP } from './t3/provider-core/handoffBudget.ts'

export { OrchestratorRuntime, bridgeCommand, type OrchestratorConfig } from './dsh/runtime.ts'
export { DshOrchestratorEngine, type EngineBackend } from './dsh/engine.ts'
export { probeAcpAgent, type AcpAgentConfig, type AcpSpawn } from './dsh/acp.ts'
export { permissionDecision, type PermissionScope, type PermissionToolCall } from './dsh/permissions.ts'
export { sessionIdForThread } from './dsh/session.ts'
export { detectAgents, KNOWN_AGENTS, type DetectOptions } from './dsh/detect.ts'
export { createThreadDirectory, type T3ThreadDirectory, type T3ThreadFact } from './dsh/threads.ts'
export { ACP_SESSION_PROVIDER, ACP_TOOL_NAME, AcpSessionBridge } from './dsh/acp-session.ts'

export const name = 't3-orchestrator'
export const inject = ['subprocess', 'storageDomain']

export type Config = OrchestratorConfig

const agentSchema = z.object({
  id: z.string().required(),
  driver: z.union(['acp', 'codex'] as const).default('acp'),
  displayName: z.string(),
  command: z.string().required(),
  args: z.array(z.string()).default([]),
  env: z.dict(z.string()).default({}),
  mcpTransport: z.union(['auto', 'http', 'stdio'] as const).default('auto'),
})

export const Config: z<Config> = z.object({
  serverKey: z.string().default('dsh-orchestrator'),
  host: z.string().default('127.0.0.1'),
  port: z.natural().default(0),
  livenessWindowMs: z.natural().default(24 * 60 * 60 * 1_000),
  idleTimeoutMs: z.natural().default(10 * 60 * 1_000),
  cancelGraceMs: z.natural().default(15_000),
  probeTimeoutMs: z.natural().default(120_000),
  probeTtlMs: z.natural().default(10 * 60 * 1_000),
  runtimeMode: z.union(['approval-required', 'auto-accept-edits', 'auto', 'full-access'] as const).default('full-access'),
  interactionMode: z.union(['default', 'plan'] as const).default('default'),
  dshAgentOptions: z.object({ provider: z.string(), model: z.string() }).default({}),
  nativeTools: z.boolean().default(true),
  handoffTokenCap: z.natural().min(1024).max(64000).default(DEFAULT_HANDOFF_TOKEN_CAP),
  worktreeRoot: z.string().default(join(homedir(), '.dsh', 't3-orchestrator', 'worktrees')),
  environmentId: z.string().default('dsh-local'),
  agents: z.array(agentSchema).default([]),
}) as never

const json = zod.json()
const orchestratorDomain = defineDomain({
  name: 't3_orchestrator',
  version: 2,
  tables: {
    projections: domainTable<string, unknown>(json),
    receipts: domainTable<string, unknown>(json),
  },
})

/** Spawn through the subprocess seam: credential-scrubbed env, explicit agent env on top. */
export function subprocessSpawn(ctx: Context): AcpSpawn {
  return (argv, cwd, env): AcpProcess => {
    const handle = ctx.subprocess.spawn({
      argv,
      cwd,
      env: { ...env },
      stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
      graceMs: 3_000,
    })
    if (!handle.stdin || !handle.stdout) throw new Error('subprocess seam dropped a piped stream')
    return {
      stdin: handle.stdin,
      stdout: handle.stdout,
      ...(handle.stderr ? { stderr: handle.stderr } : {}),
      done: handle.done.catch(() => undefined),
      dispose: async () => {
        handle.stdin?.end()
        const exitedInGrace = new Promise<false>(resolve => setTimeout(() => resolve(false), 3_000).unref())
        const exited = await Promise.race([
          handle.done.then(
            () => true,
            () => true,
          ),
          exitedInGrace,
        ])
        if (exited) return
        handle.terminate()
        await handle.waitForExit()
      },
    }
  }
}

/** The name dsh's own MCP client gives a tool: `mcp__<server>__<tool>`. */
export function nativeToolName(serverKey: string, tool: string): string {
  return `mcp__${serverKey.replace(/[^A-Za-z0-9_-]/g, '_')}__${tool}`.slice(0, 64)
}

/**
 * Register T3's tools for dsh Sessions, exactly as the in-process McpServer
 * advertises them, calling through it with the Session's scope.
 */
export async function registerNativeTools(ctx: Context, runtime: OrchestratorRuntime, serverKey: string): Promise<() => void> {
  const tools = ctx.get('tools')
  const dsh = runtime.dsh
  if (!tools || !dsh) return () => {}
  const disposers: (() => void)[] = []
  for (const tool of await runtime.listTools()) {
    disposers.push(
      tools.register({
        name: nativeToolName(serverKey, tool.name),
        description: tool.description ?? '',
        parameters: tool.inputSchema as Record<string, unknown>,
        output: {
          schema: { type: 'object' },
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
        },
        execute: async (args, exec) => {
          if (!exec.agent) throw new Error(`${tool.name} acts as the calling Session.`)
          // T3's decoder strips unknown fields; reject them before losing an intended target.
          const fields = Object.keys((args ?? {}) as Record<string, unknown>)
          const properties = tool.inputSchema.properties ?? {}
          const unknown = fields.filter(field => !Object.hasOwn(properties, field))
          if (unknown.length > 0) {
            throw new Error(`${tool.name}: unknown arguments ${unknown.join(', ')}. Provider and model selection belong inside target.`)
          }
          const threadId = dsh.ensureThread(exec.agent)
          const result = await runtime.callTool(runtime.dshScope(threadId, String(exec.agent.id)), tool.name, args)
          if (result.isError) {
            throw new Error(
              result.content.map(part => (part.type === 'text' ? part.text : '')).join('\n') || `${tool.name} failed.`,
            )
          }
          return (result.structuredContent ?? {}) as Record<string, unknown>
        },
      }),
    )
  }
  return () => {
    for (const dispose of disposers.splice(0)) dispose()
  }
}

export async function apply(ctx: Context, config: Config): Promise<void> {
  const domain = await ctx.storageDomain.open(orchestratorDomain)
  const projections = domain.table('projections')
  const receipts = domain.table('receipts')
  const backend: EngineBackend = {
    load: () => ({
      projections: [...projections.entries()].map(([, value]) => value),
      receipts: [...receipts.entries()].map(([key, value]) => [key, String(value)] as [string, string]),
    }),
    saveProjection: (threadId, encoded) => {
      void projections.put(threadId, encoded)
    },
    saveReceipt: (commandId, threadId) => {
      void receipts.put(commandId, threadId)
    },
  }
  const logger = ctx.logger('t3-orchestrator')
  const agents = config.agents.length > 0 ? config.agents : detectAgents()
  if (config.agents.length === 0) {
    logger.info(agents.length > 0
      ? `no agents configured; detected ${agents.map(agent => `${agent.id} (${agent.command})`).join(', ')}`
      : 'no agents configured and none detected')
  }
  const runtime = new OrchestratorRuntime({
    ctx,
    backend,
    spawn: subprocessSpawn(ctx),
    config: { ...config, agents },
    log: (message, error) => {
      if (error === undefined) logger.info(message)
      else logger.warn(message, error)
    },
  })
  await runtime.start()
  logger.info(`orchestrator MCP endpoint at ${runtime.endpoint}`)
  const unregisterTools = config.nativeTools ? await registerNativeTools(ctx, runtime, config.serverKey) : () => {}
  const unregisterAcpSessions = runtime.acpSessions?.register() ?? (() => {})
  const directory = createThreadDirectory(runtime.engine)
  ctx.provide('t3Threads', directory)
  const unregister = () => {
    unregisterAcpSessions()
    unregisterTools()
    directory.dispose()
  }
  void ThreadId
  ctx.effect(
    () => () => {
      unregister()
      void runtime.dispose().finally(() => domain.close())
    },
    't3-orchestrator: dispose',
  )
}
