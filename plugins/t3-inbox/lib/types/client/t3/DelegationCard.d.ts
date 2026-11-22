/**
 * The orchestrator's `delegate_task` call as T3 Code shows a delegated thread in its
 * parent's transcript: the agent's mark, the task title, the child's live status and
 * running time, and a click-through to the child Session.
 *
 * The call's arguments name the task and its target agent; once the call settles, its
 * result names the child thread, whose Session id is the thread id (the orchestrator's
 * `sessionIdForThread`), and the parent's related threads supply its live status.
 */
import type { ReactNode } from 'react';
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InboxRelations } from '../model.ts';
/** Wire name of the orchestrator's delegation tool as the parent Session calls it. */
export declare const DELEGATE_TOOL = "mcp__dsh-orchestrator__delegate_task";
export type DelegationCardInjected = {
    hooks: {
        relations: HostObservable<InboxRelations>;
    };
    open: (sessionId: string) => void;
};
export type DelegationCardProps = PropsRuntime<'tool.call.toolview'> & InjectFace<DelegationCardInjected> & PropsLocale<'t3Inbox'>;
/**
 * The child thread and terminal state a settled `delegate_task` result reports.
 * @param text - the result's text content.
 * @returns the child thread id and whether the call failed, or null for an unreadable result.
 */
export declare function delegationResult(text: string): {
    readonly childThreadId: string | null;
    readonly failed: boolean;
} | null;
/**
 * One delegated task in its parent's transcript.
 * @param props - the tool call, the parent's related threads, and the opener.
 * @returns the card.
 */
export declare function DelegationCard(props: DelegationCardProps): ReactNode;
//# sourceMappingURL=DelegationCard.d.ts.map