/**
 * Find native agents that are installed locally, for a profile that configures
 * no `agents`. Detection only looks at the filesystem: it never starts an
 * agent, signs in, or downloads anything, so an agent that `npx -y` would
 * fetch on demand is not installed. Commands follow the ACP Registry entries in
 * `scripts/agents.ts`, run through each package's own executable.
 */
import { accessSync, constants, statSync } from 'node:fs'
import { homedir as osHomedir } from 'node:os'
import nodePath from 'node:path'
import type { AcpAgentConfig } from './acp.ts'

interface KnownAgent {
  readonly id: string
  readonly displayName: string
  readonly driver?: 'codex'
  /** Executable names, most specific first. */
  readonly names: readonly string[]
  readonly args: readonly string[]
  /** Install directories outside PATH, relative to the home directory. */
  readonly homeDirs?: readonly string[]
}

/** The agents detection knows, in the order they are listed. */
export const KNOWN_AGENTS: readonly KnownAgent[] = [
  { id: 'kimi-code', displayName: 'Kimi Code', names: ['kimi'], args: ['acp'], homeDirs: ['.kimi-code/bin'] },
  { id: 'qwen-code', displayName: 'Qwen Code', names: ['qwen'], args: ['--acp', '--experimental-skills'] },
  { id: 'qoder', displayName: 'Qoder CLI', names: ['qodercli'], args: ['--acp'] },
  { id: 'codebuddy-code', displayName: 'CodeBuddy Code', names: ['codebuddy', 'codebuddy-code'], args: ['--acp'] },
  { id: 'minimax-code', displayName: 'MiniMax Code', names: ['mcode'], args: ['acp'] },
  { id: 'glm-acp-agent', displayName: 'GLM ACP agent', names: ['glm-acp-agent'], args: [] },
  { id: 'codex', displayName: 'Codex', driver: 'codex', names: ['codex'], args: [] },
]

/**
 * Global install directories package managers use, relative to the home
 * directory. A Host started from a desktop launcher may not have them on PATH.
 */
const HOME_BIN_DIRS = ['.local/bin', '.npm-global/bin', '.bun/bin', '.volta/bin', '.local/share/pnpm', 'Library/pnpm']
const POSIX_BIN_DIRS = ['/usr/local/bin', '/opt/homebrew/bin']

export interface DetectOptions {
  /** Defaults to `process.platform`. */
  readonly platform?: NodeJS.Platform
  /** Defaults to `process.env`; supplies PATH, PATHEXT, APPDATA and LOCALAPPDATA. */
  readonly env?: Readonly<Record<string, string | undefined>>
  /** Defaults to the user's home directory. */
  readonly homedir?: string
  /** Whether a path is an executable file. Defaults to a `stat` and, outside Windows, an execute-permission check. */
  readonly isExecutable?: (path: string) => boolean
}

/** Installed agents as provider instances, each with the absolute path of its own executable. */
export function detectAgents(options: DetectOptions = {}): AcpAgentConfig[] {
  const platform = options.platform ?? process.platform
  const windows = platform === 'win32'
  const path = windows ? nodePath.win32 : nodePath.posix
  const env = options.env ?? process.env
  const home = options.homedir ?? osHomedir()
  const isExecutable = options.isExecutable ?? defaultIsExecutable(windows)
  const variable = (name: string) =>
    windows ? Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1] : env[name]

  // Relative PATH entries would resolve against the Host's working directory.
  const pathDirs = (variable('PATH') ?? '').split(windows ? ';' : ':').filter(dir => dir !== '' && path.isAbsolute(dir))
  const extraDirs = [
    ...HOME_BIN_DIRS.map(dir => path.join(home, dir)),
    ...(windows
      ? [variable('APPDATA'), variable('LOCALAPPDATA')].flatMap((dir, index) =>
        dir ? [path.join(dir, index === 0 ? 'npm' : 'pnpm')] : [])
      : POSIX_BIN_DIRS),
  ]
  const extensions = windows
    ? (variable('PATHEXT') ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(extension => extension.startsWith('.'))
    : ['']

  const find = (agent: KnownAgent): string | undefined => {
    const dirs = [...(agent.homeDirs ?? []).map(dir => path.join(home, dir)), ...pathDirs, ...extraDirs]
    for (const name of agent.names) {
      for (const dir of dirs) {
        for (const extension of extensions) {
          const candidate = path.join(dir, name + extension.toLowerCase())
          if (isExecutable(candidate)) return candidate
        }
      }
    }
    return undefined
  }

  return KNOWN_AGENTS.flatMap((agent): AcpAgentConfig[] => {
    const command = find(agent)
    if (command === undefined) return []
    return [{
      id: agent.id,
      displayName: agent.displayName,
      ...(agent.driver ? { driver: agent.driver } : {}),
      command,
      args: [...agent.args],
    }]
  })
}

function defaultIsExecutable(windows: boolean): (path: string) => boolean {
  return (path) => {
    try {
      if (!statSync(path).isFile()) return false
      if (!windows) accessSync(path, constants.X_OK)
      return true
    } catch {
      return false
    }
  }
}
