/**
 * Pure sidebar view: partition listed Sessions into T3 Sidebar V2's sections.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * `partitionSidebarThreads` in `apps/web/src/components/Sidebar.tsx`,
 * `resolveSidebarThreadSection`, `resolveSidebarThreadStatus` and
 * `shouldRecedeSidebarThread` in `Sidebar.logic.ts`, `sortInboxThreadsByReturn`,
 * `sortWorkingThreadsBySend` and `isThreadWorking` in
 * `packages/client-runtime/src/state/threadInbox.ts`, and `sortSettledThreads` in
 * `threadSort.ts`. T3 thread shells become Harness Session facts; see PORTING.md.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
 */
import { type InboxSessionFacts } from '../logic.ts';
import type { InboxRecord } from '../types.ts';
/** T3 `SidebarSection`. */
export type InboxSection = 'pinned' | 'active' | 'working' | 'snoozed' | 'settled';
/** T3 `SidebarThreadStatus`, reduced to the states a Harness Session can report. */
export type InboxStatus = 'approval' | 'input' | 'working' | 'waiting' | 'ready';
/** One Session the sidebar may show. */
export interface InboxSessionInput extends InboxSessionFacts {
    readonly id: string;
    readonly title: string;
    /** Workspace id and title, or null outside any Workspace. */
    readonly projectId: string | null;
    readonly projectName: string | null;
    readonly cwd: string | null;
    readonly pinned: boolean;
    /** A finished run the user has not seen (T3 `hasUnseenCompletion`). */
    readonly unread: boolean;
    /** When the Client first saw the current run, epoch milliseconds. */
    readonly runningSince: number | null;
    /** When the Client last saw the Session in the main view, epoch milliseconds. */
    readonly lastVisitedAt: number | null;
    /**
     * Latest activity: the last prompt or a finished run (T3 `resolveThreadActivityTimestamp`),
     * epoch milliseconds. Title edits and other log writes do not count.
     */
    readonly activityAt: number;
    /** Git branch checked out in the working directory, when it is a repository. */
    readonly branch: string | null;
    /** Provider route and model of the latest model request. */
    readonly model: {
        readonly provider: string;
        readonly model: string;
    } | null;
    /** Orchestrator thread: the running turn only waits on another thread (T3 `blockedOnThreadWait`). */
    readonly blockedOnThreadWait: boolean;
    /** Orchestrator thread: settled, but delegated work it waits on runs (T3 runtime `idle`). */
    readonly backgroundWork: boolean;
}
/** One presented sidebar row. */
export interface InboxRow extends InboxSessionInput {
    readonly section: InboxSection;
    readonly status: InboxStatus;
    readonly record: InboxRecord | undefined;
    /** When the row woke from a snooze; null while snoozed or never snoozed. */
    readonly wokeAt: number | null;
    /** Woke after the user last saw it, so the row shows "Woke". */
    readonly isWoke: boolean;
    readonly autoSettleEnabled: boolean;
}
/** The whole sidebar list, one snapshot per input change. */
export interface InboxView {
    readonly pinned: readonly InboxRow[];
    readonly active: readonly InboxRow[];
    readonly working: readonly InboxRow[];
    readonly snoozed: readonly InboxRow[];
    readonly settled: readonly InboxRow[];
    readonly byId: ReadonlyMap<string, InboxRow>;
    /** Rows waiting for the user: approvals, questions, and unseen wakes. */
    readonly attentionCount: number;
    /** Earliest future snooze wake, epoch milliseconds; null when nothing is snoozed. */
    readonly nextWakeAt: number | null;
}
type StatusFacts = InboxSessionFacts & {
    readonly blockedOnThreadWait?: boolean;
    readonly backgroundWork?: boolean;
};
/** T3 `resolveSidebarThreadStatus`. */
export declare function resolveStatus(session: StatusFacts): InboxStatus;
/** T3 `isThreadWorking`: running or parked at idle, and not waiting on the user. */
export declare function isWorking(session: StatusFacts): boolean;
/** T3 `shouldRecedeSidebarThread`. */
export declare function shouldRecede(input: {
    readonly status: InboxStatus;
    readonly isUnread: boolean;
    readonly isWoke: boolean;
    readonly isActive: boolean;
}): boolean;
/**
 * Partition and order Sessions into T3's sections.
 * @param sessions - candidate Sessions, already scoped and filtered.
 * @param records - inbox overlays keyed by Session id, optimistic edits applied.
 * @param pinOrder - pinned Session ids in pin order.
 * @param nowMs - current instant; snooze wakes derive from it.
 * @returns the sectioned view.
 */
export declare function buildInboxView(sessions: readonly InboxSessionInput[], records: Readonly<Record<string, InboxRecord>>, pinOrder: readonly string[], nowMs: number): InboxView;
export {};
//# sourceMappingURL=view.d.ts.map