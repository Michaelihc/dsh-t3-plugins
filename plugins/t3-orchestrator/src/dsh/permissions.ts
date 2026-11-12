/**
 * Unattended answers to ACP `session/request_permission`. dsh has no surface
 * where a person answers an ACP child's requests, so the thread's runtime mode
 * decides (PORTING.md, forced deviations):
 *
 * - `full-access` and `auto` allow every request.
 * - `auto-accept-edits` allows `think`, and allows `read`, `search`, `edit`
 *   and `delete` only when every path the request names is inside the
 *   thread's workspace. A request that names no path is rejected, because its
 *   target cannot be checked. `delete` must name a path strictly below the
 *   workspace root. `move` is rejected because ACP does not require the
 *   destination to be listed. `fetch`, `execute`, `switch_mode`, `other` and
 *   unknown kinds are rejected; Codex at this mode runs with network access
 *   disabled, and a fetch can reach loopback services or send workspace data.
 * - Every other mode rejects.
 *
 * Paths come from the request's `locations` and from well-known path fields
 * of its `rawInput`. Each is resolved against the workspace, its symlinks and
 * junctions are followed component by component as the operating system
 * would, and it is compared with the workspace's real path (case-insensitively
 * on Windows).
 */
import { realpathSync, lstatSync } from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RuntimeMode } from '../t3/contracts/index.ts'

/** The parts of an ACP `ToolCallUpdate` a permission decision reads. */
export interface PermissionToolCall {
  readonly kind?: string | null
  readonly locations?: readonly { readonly path?: unknown }[] | null
  readonly rawInput?: unknown
}

/** Filesystem access used to resolve paths; replaceable in tests. */
export interface PermissionFs {
  /** Whether the path exists, without following a final symlink. */
  exists(path: string): boolean
  /** The canonical path of an existing path, following every link. */
  realpath(path: string): string
}

export interface PermissionScope {
  /** The thread's working directory: its worktree, else its project directory. */
  readonly workspace: string
  /** Defaults to `process.platform`. */
  readonly platform?: NodeJS.Platform
  /** Defaults to the real filesystem. */
  readonly fs?: PermissionFs
}

export type PermissionDecision = 'allow' | 'reject'

const nodeFs: PermissionFs = {
  exists: (path) => {
    try {
      lstatSync(path)
      return true
    } catch {
      return false
    }
  },
  realpath: path => realpathSync.native(path),
}

/** Kinds `auto-accept-edits` allows when every named path is inside the workspace. */
const CONFINED_KINDS = new Set(['read', 'search', 'edit', 'delete'])

/** `rawInput` fields agents use for the file or directory a tool acts on. */
const PATH_FIELDS = new Set([
  'path', 'paths', 'file', 'files', 'file_path', 'filePath', 'filepath', 'file_paths', 'filePaths', 'filename',
  'abs_path', 'absolute_path', 'absolutePath', 'target_file', 'targetFile', 'directory', 'dir', 'dir_path',
  'cwd', 'root', 'notebook_path', 'old_path', 'new_path', 'oldPath', 'newPath', 'destination', 'dest',
])

/**
 * Decide one permission request.
 * @param mode - the requesting thread's runtime mode.
 * @param toolCall - the tool call the agent asks about, merged with what it announced earlier.
 * @param scope - the thread's workspace.
 */
export function permissionDecision(
  mode: RuntimeMode,
  toolCall: PermissionToolCall,
  scope: PermissionScope,
): PermissionDecision {
  if (mode === 'full-access' || mode === 'auto') return 'allow'
  if (mode !== 'auto-accept-edits') return 'reject'
  const kind = toolCall.kind ?? ''
  if (kind === 'think') return 'allow'
  if (!CONFINED_KINDS.has(kind)) return 'reject'
  const paths = requestedPaths(toolCall)
  if (paths === null || paths.length === 0) return 'reject'
  const platform = scope.platform ?? process.platform
  const fs = scope.fs ?? nodeFs
  const root = physicalPath(scope.workspace, scope.workspace, platform, fs)
  if (root === null || !fs.exists(root)) return 'reject'
  for (const requested of paths) {
    const resolved = physicalPath(requested, root, platform, fs)
    if (resolved === null) return 'reject'
    const relation = relationTo(root, resolved, platform)
    if (relation === 'outside') return 'reject'
    if (relation === 'root' && kind === 'delete') return 'reject'
  }
  return 'allow'
}

/** Every path the request names, or `null` when one of them is not a string. */
function requestedPaths(toolCall: PermissionToolCall): string[] | null {
  const paths: string[] = []
  for (const location of toolCall.locations ?? []) {
    if (typeof location?.path !== 'string') return null
    paths.push(location.path)
  }
  const raw = toolCall.rawInput
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!PATH_FIELDS.has(key)) continue
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (typeof entry === 'string' && entry !== '' && !entry.includes('\n')) paths.push(entry)
      }
    }
  }
  return paths
}

/**
 * Where a path leads on disk: resolved against `base`, with every existing
 * component's links followed in order, so `link/..` means the link target's
 * parent as it does for the operating system. Components that do not exist
 * yet are appended as written. `null` for a path that cannot be judged.
 */
function physicalPath(input: string, base: string, platform: NodeJS.Platform, fs: PermissionFs): string | null {
  const windows = platform === 'win32'
  const path = windows ? nodePath.win32 : nodePath.posix
  let text = input
  if (text.includes('\0')) return null
  if (/^file:/i.test(text)) {
    try {
      text = fileURLToPath(text, { windows })
    } catch {
      return null
    }
  }
  // Shells and some tools expand these; the literal name is never what the agent means.
  if (/^[~$%]/.test(text)) return null
  if (windows) {
    // A drive-relative path (`C:foo`) depends on that drive's hidden current directory.
    if (/^[A-Za-z]:(?![\\/])/.test(text)) return null
    // Device and verbatim namespaces (`\\?\`, `\\.\`) bypass Win32 path normalization.
    if (/^[\\/]{2}[?.][\\/]/.test(text)) return null
  }
  const absolute = path.isAbsolute(text) ? text : path.join(base, text)
  const rootPart = path.parse(absolute).root
  if (rootPart === '') return null
  const segments = absolute.slice(rootPart.length).split(windows ? /[\\/]+/ : /\/+/)
  let current = safeRealpath(rootPart, fs) ?? rootPart
  let existing = true
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      current = path.dirname(current)
      if (!existing && fs.exists(current)) existing = true
      continue
    }
    // Win32 drops trailing dots and spaces, so `.. ` would name the parent.
    if (windows && /[. ]$/.test(segment)) return null
    // Alternate data streams and reserved device names are not workspace files.
    if (windows && (segment.includes(':') || /^(con|prn|aux|nul|conin\$|conout\$|com\d|lpt\d)(\..*)?$/i.test(segment))) return null
    const next = path.join(current, segment)
    if (existing && fs.exists(next)) {
      const real = safeRealpath(next, fs)
      if (real === null) return null
      current = real
    } else {
      existing = false
      current = next
    }
  }
  return current
}

function safeRealpath(path: string, fs: PermissionFs): string | null {
  try {
    return fs.realpath(path)
  } catch {
    return null
  }
}

function relationTo(root: string, candidate: string, platform: NodeJS.Platform): 'root' | 'inside' | 'outside' {
  const windows = platform === 'win32'
  const path = windows ? nodePath.win32 : nodePath.posix
  const fold = (value: string) => (windows ? value.toLowerCase() : value)
  const relative = path.relative(fold(root), fold(candidate))
  if (relative === '') return 'root'
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return 'outside'
  return 'inside'
}
