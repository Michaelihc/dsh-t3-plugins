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
import { effectiveSnoozed, isWokeUnseen, wokeAt } from "../logic.js";
/** T3 `resolveSidebarThreadStatus`. */
export function resolveStatus(session) {
    if (session.approval)
        return 'approval';
    if (session.question)
        return 'input';
    if (session.running && session.blockedOnThreadWait === true)
        return 'waiting';
    if (session.running)
        return 'working';
    // T3 parks a settled run whose background work holds completion at runtime `idle`.
    if (session.backgroundWork === true)
        return 'waiting';
    return 'ready';
}
/** T3 `isThreadWorking`: running or parked at idle, and not waiting on the user. */
export function isWorking(session) {
    return (session.running || session.backgroundWork === true) && !session.approval && !session.question;
}
/** T3 `shouldRecedeSidebarThread`. */
export function shouldRecede(input) {
    if (input.isActive || input.status === 'input')
        return false;
    if (input.status === 'working' || input.status === 'waiting')
        return true;
    return !input.isUnread && !input.isWoke;
}
function byIdOrder(left, right) {
    return left.id.localeCompare(right.id);
}
function parse(value) {
    if (value == null)
        return 0;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
}
/** T3 `sortInboxThreadsByReturn`: newest return to the inbox first. */
function returnAt(row) {
    return Math.max(row.activityAt, parse(row.record?.unsettledAt), row.wokeAt ?? 0);
}
/** T3 `sortWorkingThreadsBySend`: newest send first. */
function sendAt(row) {
    return row.runningSince ?? row.activityAt;
}
/**
 * Partition and order Sessions into T3's sections.
 * @param sessions - candidate Sessions, already scoped and filtered.
 * @param records - inbox overlays keyed by Session id, optimistic edits applied.
 * @param pinOrder - pinned Session ids in pin order.
 * @param nowMs - current instant; snooze wakes derive from it.
 * @returns the sectioned view.
 */
export function buildInboxView(sessions, records, pinOrder, nowMs) {
    const sections = { pinned: [], active: [], working: [], snoozed: [], settled: [] };
    const rows = new Map();
    let nextWakeAt = null;
    let attentionCount = 0;
    for (const session of sessions) {
        const record = records[session.id];
        const snoozed = record !== undefined && effectiveSnoozed(record, session, nowMs);
        const settled = record?.settledAt != null;
        // T3 resolveSidebarThreadSection: snoozed, then settled, then pinned, then inbox.
        const section = snoozed
            ? 'snoozed'
            : settled ? 'settled' : session.pinned ? 'pinned' : isWorking(session) ? 'working' : 'active';
        const woke = record === undefined ? null : wokeAt(record, session, nowMs);
        const row = {
            ...session,
            section,
            status: resolveStatus(session),
            record,
            wokeAt: woke,
            isWoke: isWokeUnseen({ wokeAt: woke, settled, lastVisitedAt: session.lastVisitedAt }),
            autoSettleEnabled: record?.autoSettleDisabled !== true,
        };
        rows.set(row.id, row);
        sections[section].push(row);
        if (snoozed) {
            const wake = parse(record.snoozedUntil);
            if (nextWakeAt === null || wake < nextWakeAt)
                nextWakeAt = wake;
        }
        if (section !== 'settled' && section !== 'snoozed' && (row.status === 'approval' || row.status === 'input' || row.isWoke)) {
            attentionCount += 1;
        }
    }
    const pinRank = new Map(pinOrder.map((id, index) => [id, index]));
    sections.pinned.sort((left, right) => (pinRank.get(left.id) ?? 0) - (pinRank.get(right.id) ?? 0));
    sections.active.sort((left, right) => returnAt(right) - returnAt(left) || byIdOrder(left, right));
    sections.working.sort((left, right) => sendAt(right) - sendAt(left) || byIdOrder(left, right));
    sections.snoozed.sort((left, right) => parse(left.record?.snoozedUntil) - parse(right.record?.snoozedUntil));
    sections.settled.sort((left, right) => (parse(right.record?.settledAt) || right.updatedAt) - (parse(left.record?.settledAt) || left.updatedAt) || byIdOrder(left, right));
    return { ...sections, byId: rows, attentionCount, nextWakeAt };
}
//# sourceMappingURL=view.js.map