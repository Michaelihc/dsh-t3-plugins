/**
 * The `t3Threads` Host service: what a thread list needs from the orchestrator about
 * each dsh Session that is an orchestrator thread. The T3-style inbox reads it to hide
 * subagent threads as T3's sidebar does (`isListedThreadLineage`), to show an open
 * child under its nearest listed ancestor (`resolveSidebarRowThreadId`), and to show
 * Waiting (`blockedOnThreadWait`, `backgroundWorkHoldsCompletion`).
 */
import { isListedThreadLineage, type ThreadId } from '../t3/contracts/index.ts'
import { backgroundWorkHoldsCompletion } from '../t3/shared/orchestrationV2PendingBackgroundWork.ts'
import type { DshOrchestratorEngine } from './engine.ts'
import { sessionIdForThread } from './session.ts'

/** One orchestrator thread, keyed by its dsh Session id. */
export interface T3ThreadFact {
  /** False for subagents and side chats, which T3 lists only inside their parent. */
  readonly listed: boolean
  /** The parent thread's Session id, when the thread has one. */
  readonly parentSessionId: string | null
  /** The running turn only waits on t3_thread_wait or a blocking delegation. */
  readonly blockedOnThreadWait: boolean
  /** Settled, but delegated work it waits on is still running. */
  readonly backgroundWork: boolean
}

export interface T3ThreadDirectory {
  /** Facts for every live orchestrator thread, by Session id. */
  facts(): Readonly<Record<string, T3ThreadFact>>
  /** Called after the facts change; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    t3Threads: T3ThreadDirectory
  }
}

const NOTIFY_MS = 150

export function createThreadDirectory(engine: DshOrchestratorEngine): T3ThreadDirectory & { dispose(): void } {
  const listeners = new Set<() => void>()
  let last = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  const facts = (): Record<string, T3ThreadFact> => {
    const out: Record<string, T3ThreadFact> = {}
    for (const threadId of engine.threadIds()) {
      const shell = engine.shell(threadId)
      if (!shell || shell.deletedAt !== null) continue
      const parent = shell.lineage.parentThreadId
      out[sessionIdForThread(threadId)] = {
        listed: isListedThreadLineage(shell.lineage),
        parentSessionId: parent === null ? null : sessionIdForThread(parent as ThreadId),
        blockedOnThreadWait: engine.blockedOnThreadWait(threadId),
        backgroundWork: backgroundWorkHoldsCompletion(shell.pendingBackgroundTasks ?? []),
      }
    }
    return out
  }
  const check = (): void => {
    timer = undefined
    const next = JSON.stringify(facts())
    if (next === last) return
    last = next
    for (const listener of [...listeners]) listener()
  }
  const stop = engine.onStoredEvent(() => {
    timer ??= setTimeout(check, NOTIFY_MS)
  })
  return {
    facts,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      stop()
      clearTimeout(timer)
      listeners.clear()
    },
  }
}
