/**
 * Inbox settle/snooze rules shared by the Host sweep and the browser sidebar.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * `packages/client-runtime/src/state/threadSettled.ts`, the auto-settlement
 * candidate rules of `apps/server/src/orchestration-v2/ThreadSettlementService.ts`,
 * and `DEFAULT_SNOOZE_PRESETS` from `packages/contracts/src/settings.ts`.
 * The `effect` DateTime dependency is replaced with plain `Date`; T3 thread
 * shells are replaced with the Harness Session facts listed in
 * {@link InboxSessionFacts}. See PORTING.md for forced deviations.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
 * WITHOUT WARRANTY OF ANY KIND.
 */
import type { InboxRecord } from './types.ts';
/** Session facts the inbox needs; the Host sweep and the browser can both supply them. */
export interface InboxSessionFacts {
    readonly running: boolean;
    /** An approval request is waiting for the user (T3 `hasPendingApprovals`). */
    readonly approval: boolean;
    /** A question is waiting for the user (T3 `hasPendingUserInput`). */
    readonly question: boolean;
    /** When the pending question was first observed, epoch milliseconds; null when unknown. */
    readonly questionAt: number | null;
    /** Last durable activity, epoch milliseconds. */
    readonly updatedAt: number;
}
/**
 * Only a request for the user ends a snooze early. Completed runs never do: a snoozed
 * long-running Session keeps working in the background and stays hidden until its timer.
 * Snoozing an existing question means "ask me later"; only a newer question wakes it.
 * @param record - stored inbox overlay.
 * @param facts - live Session facts.
 * @returns whether the Session demands attention despite its snooze.
 */
export declare function raisedHandWhileSnoozed(record: InboxRecord, facts: InboxSessionFacts): boolean;
/** Snoozed while the wake time is in the future and no hand is raised; malformed data never hides. */
export declare function effectiveSnoozed(record: InboxRecord, facts: InboxSessionFacts, nowMs: number): boolean;
/**
 * When a snoozed Session woke, or null while still snoozed or never snoozed. An early
 * hand-raise wake stays authoritative after the scheduled time passes.
 * @returns epoch milliseconds of the wake.
 */
export declare function wokeAt(record: InboxRecord, facts: InboxSessionFacts, nowMs: number): number | null;
/**
 * A woke Session shows "Woke" until the user sees it after the wake. A run that
 * finished after the last visit counts as seeing it (T3 `isThreadWokeUnseen`).
 */
export declare function isWokeUnseen(input: {
    readonly wokeAt: number | null;
    readonly settled: boolean;
    readonly lastVisitedAt: number | null;
}): boolean;
/** Snoozing is refused only while an approval waits; a question may be snoozed ("ask me later"). */
export declare function canSnooze(facts: InboxSessionFacts): boolean;
/**
 * Host auto-settle candidate: not settled or unsettled by hand, auto-settle not turned
 * off, nothing pending, not running, not on a future snooze, idle past the threshold.
 * A timer wake counts as activity, so a woken Session gets a fresh idle window.
 */
export declare function shouldAutoSettle(record: InboxRecord | undefined, facts: InboxSessionFacts, nowMs: number, afterDays: number | null): boolean;
/** One shared snooze setting (T3 `SnoozePresetSetting`). */
export type SnoozePresetSetting = {
    readonly kind: 'after';
    readonly minutes: number;
} | {
    readonly kind: 'at';
    readonly day: 'today' | 'tomorrow' | 'monday';
    readonly time: string;
};
/** T3 `DEFAULT_SNOOZE_PRESETS`. */
export declare const DEFAULT_SNOOZE_PRESETS: readonly SnoozePresetSetting[];
/** A whole number of one time unit; the client formats it in the active language. */
export interface TimeAmount {
    readonly unit: 'second' | 'minute' | 'hour' | 'day';
    readonly value: number;
}
/** A relative time, or the moment itself. */
export type RelativeTime = TimeAmount | {
    readonly unit: 'now';
};
/** What a snooze preset is called, before the client names it in the active language. */
export type SnoozePresetKind = {
    readonly kind: 'after';
    readonly amount: TimeAmount;
} | {
    readonly kind: 'morning' | 'afternoon' | 'evening' | 'tomorrow' | 'nextWeek';
};
/** One "snooze until" choice. */
export interface SnoozePreset {
    readonly id: string;
    readonly name: SnoozePresetKind;
    /** Whether the wake time shows its weekday: durations and "Next week" do not name the day. */
    readonly showsDay: boolean;
    /** The wake time. */
    readonly wakeAt: Date;
    /** ISO wake time. */
    readonly snoozedUntil: string;
}
/** Resolve one setting; a today option whose time has passed is left out until tomorrow. */
export declare function resolveSnoozePreset(setting: SnoozePresetSetting, now: Date): SnoozePreset | null;
/** The snooze menu: soonest first, one row per wake minute. */
export declare function resolveSnoozePresets(now: Date, presets?: readonly SnoozePresetSetting[]): readonly SnoozePreset[];
/**
 * A menu choice as picked. A duration re-resolves from its setting so it starts at
 * selection; a set time keeps the shown wake. Null when the shown time has passed.
 */
export declare function pickSnoozePreset(shown: readonly SnoozePreset[], id: string, now: Date): SnoozePreset | null;
/** Time until a snoozed Session wakes: minutes round up so a hidden row never reads "0m". */
export declare function snoozeWakeIn(snoozedUntil: string, nowMs: number): RelativeTime;
/** T3 `formatWorkingDurationLabel` as parts: 42s, 29m, or 1h 5m. */
export declare function workingDurationParts(elapsedMs: number): readonly TimeAmount[];
/** T3 compact sidebar relative time: now, 5m, 3h, 2d. */
export declare function compactRelativeTime(atMs: number, nowMs: number): RelativeTime;
export type CustomSnoozeInput = {
    readonly mode: 'date';
    readonly date: string;
    readonly time: string;
} | {
    readonly mode: 'duration';
    readonly amount: string;
    readonly unit: 'minutes' | 'hours' | 'days';
};
/** Local `YYYY-MM-DD` of a date. */
export declare function localSnoozeDate(date: Date): string;
/** Local `HH:MM` of a date. */
export declare function localSnoozeTime(date: Date): string;
/** Resolve local calendar input or elapsed time, rejecting past, invalid, and DST-nonexistent times. */
export declare function resolveCustomSnooze(input: CustomSnoozeInput, now: Date): string | null;
//# sourceMappingURL=logic.d.ts.map