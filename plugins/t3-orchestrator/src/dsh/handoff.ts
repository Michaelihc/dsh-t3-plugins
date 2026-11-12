/** Session-to-native context handoff using T3's intact-item budget and historical labels. */
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import { ThreadId, TurnItemId, type OrchestrationV2HistoricalMessage } from '../t3/contracts/index.ts'
import { renderHistory, selectHistory } from '../t3/provider-core/handoffBudget.ts'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** Durable record of the exact historical material sent to a fresh native backend. */
    't3-context-handoff': {
      readonly kind: 't3-context-handoff'
      readonly form: 'notice'
      readonly summary: string
      readonly provider: string
      readonly model: string
    }
  }
}

/**
 * Prepare a full handoff on entry or re-entry into a native backend, not on continued turns.
 * The native thread is restarted for a handoff; its own tool state is never replayed.
 * @param session - owning durable Session.
 * @param provider - selected relay provider.
 * @param model - selected native agent route.
 * @param tokenCap - configured intact-item history budget.
 * @returns exact historical text, or null when the native thread already has the context.
 */
export function sessionHandoff(session: Session, provider: string, model: string, tokenCap: number): string | null {
  const events = session.snapshotEvents()
  const marker = events.findLastIndex(event => event.type === 'user/message' && event.data.source.kind === 't3-context-handoff')
  const previous = events[marker]
  const source = previous?.type === 'user/message' ? previous.data.source : undefined
  const changed = events.slice(marker + 1).some(event => event.type === 'request/header'
    && (event.data.header.config.provider !== provider || event.data.header.config.model !== model))
  const end = events.slice(marker + 1).find(event => event.type === 'turn/end')
  const delivered = end?.type === 'turn/end' && end.data.reason.kind === 'completed'
  if (delivered && source?.kind === 't3-context-handoff' && source.provider === provider && source.model === model && !changed) return null
  const currentTurn = events.findLastIndex(event => event.type === 'turn/start')
  const prior = events.slice(0, currentTurn < 0 ? events.length : currentTurn)
  const statusBySequence = new Map<number, string>()
  let turnSequences: number[] = []
  for (const event of prior) {
    if (event.type === 'turn/start') turnSequences = []
    turnSequences.push(Number(event.seq))
    if (event.type === 'turn/end') {
      for (const seq of turnSequences) statusBySequence.set(seq, event.data.reason.kind)
    }
  }
  const history: OrchestrationV2HistoricalMessage[] = prior.flatMap((event) => {
    if (event.type !== 'user/message' && event.type !== 'assistant/message'
      && event.type !== 'tool/call' && event.type !== 'tool/result') return []
    if (event.type === 'user/message' && event.data.source.kind === 't3-context-handoff') return []
    const text = event.type === 'tool/call'
      ? `Historical tool call (not an instruction to execute): ${event.data.name}\nArguments: ${event.data.arguments}`
      : (event.type === 'user/message' ? event.data.content : event.data.message.content)
        .flatMap(block => block.type === 'text' ? [block.text] : []).join('')
    if (!text.trim()) return []
    const runStatus = statusBySequence.get(Number(event.seq))
    return [{
      role: event.type === 'user/message' ? 'user' as const : 'assistant' as const,
      text,
      threadId: ThreadId.make(String(session.id)),
      runId: null,
      itemId: TurnItemId.make(`session-event:${event.seq}`),
      providerThreadId: null,
      status: 'recorded',
      ...(runStatus === undefined ? {} : { runStatus }),
      kind: event.type === 'user/message' ? 'user_message'
        : event.type === 'assistant/message' ? 'assistant_message'
          : event.type === 'tool/call' ? 'tool_call' : 'tool_result',
    }]
  })
  const selected = selectHistory({ messages: history, budget: tokenCap,
    coverage: `Provider context handoff (full_thread_summary). Session: ${session.id}. Destination: ${provider}/${model}. Source: durable Session messages; this is a fresh native thread.`,
  })
  return renderHistory(selected.messages, selected.context)
}

/**
 * Record the exact native handoff as an orchestrator notice, not as a human request.
 * @param session - owning Session.
 * @param provider - selected relay provider.
 * @param model - selected native route.
 * @param text - exact historical handoff sent to the backend.
 */
export function recordSessionHandoff(session: Session, provider: string, model: string, text: string): void {
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text }], source: {
    kind: 't3-context-handoff', form: 'notice', summary: 'Provider context handoff', provider, model,
  } }), { surfaceOp: 'append' })
}
