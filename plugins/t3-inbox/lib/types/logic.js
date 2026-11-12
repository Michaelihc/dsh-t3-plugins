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
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
function parse(value) {
    if (value == null)
        return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
}
/**
 * Only a request for the user ends a snooze early. Completed runs never do: a snoozed
 * long-running Session keeps working in the background and stays hidden until its timer.
 * Snoozing an existing question means "ask me later"; only a newer question wakes it.
 * @param record - stored inbox overlay.
 * @param facts - live Session facts.
 * @returns whether the Session demands attention despite its snooze.
 */
export function raisedHandWhileSnoozed(record, facts) {
    if (facts.approval)
        return true;
    const snoozedAt = parse(record.snoozedAt);
    return facts.question && (snoozedAt === null || facts.questionAt === null || !(facts.questionAt <= snoozedAt));
}
/** Snoozed while the wake time is in the future and no hand is raised; malformed data never hides. */
export function effectiveSnoozed(record, facts, nowMs) {
    const wakeAt = parse(record.snoozedUntil);
    if (wakeAt === null || wakeAt <= nowMs)
        return false;
    return !raisedHandWhileSnoozed(record, facts);
}
/**
 * When a snoozed Session woke, or null while still snoozed or never snoozed. An early
 * hand-raise wake stays authoritative after the scheduled time passes.
 * @returns epoch milliseconds of the wake.
 */
export function wokeAt(record, facts, nowMs) {
    const wakeAt = parse(record.snoozedUntil);
    if (wakeAt === null)
        return null;
    if (raisedHandWhileSnoozed(record, facts)) {
        const snoozedAt = parse(record.snoozedAt);
        if (facts.questionAt !== null && snoozedAt !== null && facts.questionAt > snoozedAt)
            return facts.questionAt;
        return facts.updatedAt > 0 ? facts.updatedAt : snoozedAt;
    }
    return wakeAt <= nowMs ? wakeAt : null;
}
/**
 * A woke Session shows "Woke" until the user sees it after the wake. A run that
 * finished after the last visit counts as seeing it (T3 `isThreadWokeUnseen`).
 */
export function isWokeUnseen(input) {
    if (input.wokeAt === null || input.settled)
        return false;
    return input.lastVisitedAt === null || input.lastVisitedAt < input.wokeAt;
}
/** Snoozing is refused only while an approval waits; a question may be snoozed ("ask me later"). */
export function canSnooze(facts) {
    return !facts.approval;
}
/**
 * Host auto-settle candidate: not settled or unsettled by hand, auto-settle not turned
 * off, nothing pending, not running, not on a future snooze, idle past the threshold.
 * A timer wake counts as activity, so a woken Session gets a fresh idle window.
 */
export function shouldAutoSettle(record, facts, nowMs, afterDays) {
    if (afterDays === null)
        return false;
    if (record?.settledAt != null || record?.unsettledAt != null || record?.autoSettleDisabled === true)
        return false;
    if (facts.approval || facts.question || facts.running)
        return false;
    if (record !== undefined && effectiveSnoozed(record, facts, nowMs))
        return false;
    const wake = parse(record?.snoozedUntil);
    const inactivityAt = Math.max(facts.updatedAt, wake !== null && wake <= nowMs ? wake : 0);
    return inactivityAt > 0 && inactivityAt < nowMs - afterDays * DAY_MS;
}
/** T3 `DEFAULT_SNOOZE_PRESETS`. */
export const DEFAULT_SNOOZE_PRESETS = [
    { kind: 'after', minutes: 60 },
    { kind: 'after', minutes: 180 },
    { kind: 'at', day: 'today', time: '18:00' },
    { kind: 'at', day: 'tomorrow', time: '09:00' },
    { kind: 'at', day: 'monday', time: '09:00' },
];
// Calendar-day advance: fixed 24h offsets land on the wrong local day across DST.
function addDays(base, days) {
    const next = new Date(base.getTime());
    next.setDate(next.getDate() + days);
    return next;
}
function snoozeDuration(minutes) {
    if (minutes % (24 * 60) === 0)
        return { unit: 'day', value: minutes / (24 * 60) };
    if (minutes % 60 === 0)
        return { unit: 'hour', value: minutes / 60 };
    return { unit: 'minute', value: minutes };
}
function daysAhead(setting, now) {
    if (setting.day === 'today')
        return 0;
    if (setting.day === 'tomorrow')
        return 1;
    return (1 - now.getDay() + 7) % 7 || 7;
}
function presetName(setting, ahead) {
    if (setting.kind === 'after')
        return { kind: 'after', amount: snoozeDuration(setting.minutes) };
    if (ahead === 0) {
        const hour = Number(setting.time.slice(0, 2));
        return { kind: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening' };
    }
    return { kind: ahead === 1 ? 'tomorrow' : 'nextWeek' };
}
function presetId(setting) {
    return setting.kind === 'after' ? `after:${setting.minutes}` : `at:${setting.day}:${setting.time}`;
}
/** Resolve one setting; a today option whose time has passed is left out until tomorrow. */
export function resolveSnoozePreset(setting, now) {
    let wake;
    let ahead = 0;
    if (setting.kind === 'after') {
        wake = new Date(now.getTime() + setting.minutes * MINUTE_MS);
    }
    else {
        ahead = daysAhead(setting, now);
        wake = addDays(now, ahead);
        wake.setHours(Number(setting.time.slice(0, 2)), Number(setting.time.slice(3)), 0, 0);
        if (wake.getTime() <= now.getTime())
            return null;
    }
    const name = presetName(setting, ahead);
    // Durations and "Next week" don't name the wake day, so a wake on another day shows it.
    const labelNamesDay = setting.kind === 'at' && name.kind !== 'nextWeek';
    return {
        id: presetId(setting),
        name,
        showsDay: !(labelNamesDay || wake.toDateString() === now.toDateString()),
        wakeAt: wake,
        snoozedUntil: wake.toISOString(),
    };
}
/** The snooze menu: soonest first, one row per wake minute. */
export function resolveSnoozePresets(now, presets = DEFAULT_SNOOZE_PRESETS) {
    const wakeMinute = (preset) => Math.floor(Date.parse(preset.snoozedUntil) / MINUTE_MS);
    const seen = new Set();
    return presets
        .flatMap(setting => resolveSnoozePreset(setting, now) ?? [])
        .sort((left, right) => wakeMinute(left) - wakeMinute(right))
        .filter((preset) => {
        if (seen.has(wakeMinute(preset)))
            return false;
        seen.add(wakeMinute(preset));
        return true;
    });
}
/**
 * A menu choice as picked. A duration re-resolves from its setting so it starts at
 * selection; a set time keeps the shown wake. Null when the shown time has passed.
 */
export function pickSnoozePreset(shown, id, now) {
    const preset = shown.find(candidate => candidate.id === id);
    if (preset === undefined)
        return null;
    if (id.startsWith('after:'))
        return resolveSnoozePreset({ kind: 'after', minutes: Number(id.slice(6)) }, now);
    return Date.parse(preset.snoozedUntil) > now.getTime() ? preset : null;
}
/** Time until a snoozed Session wakes: minutes round up so a hidden row never reads "0m". */
export function snoozeWakeIn(snoozedUntil, nowMs) {
    const wake = parse(snoozedUntil);
    if (wake === null)
        return { unit: 'now' };
    const remaining = wake - nowMs;
    if (remaining <= 0)
        return { unit: 'now' };
    if (remaining < HOUR_MS)
        return { unit: 'minute', value: Math.max(1, Math.ceil(remaining / MINUTE_MS)) };
    if (remaining < DAY_MS)
        return { unit: 'hour', value: Math.ceil(remaining / HOUR_MS) };
    return { unit: 'day', value: Math.ceil(remaining / DAY_MS) };
}
/** T3 `formatWorkingDurationLabel` as parts: 42s, 29m, or 1h 5m. */
export function workingDurationParts(elapsedMs) {
    const seconds = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs / 1000)) : 0;
    if (seconds < 60)
        return [{ unit: 'second', value: seconds }];
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return [{ unit: 'minute', value: minutes }];
    return [{ unit: 'hour', value: Math.floor(minutes / 60) }, { unit: 'minute', value: minutes % 60 }];
}
/** T3 compact sidebar relative time: now, 5m, 3h, 2d. */
export function compactRelativeTime(atMs, nowMs) {
    const seconds = Math.floor((nowMs - atMs) / 1000);
    if (seconds < 60)
        return { unit: 'now' };
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return { unit: 'minute', value: minutes };
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return { unit: 'hour', value: hours };
    return { unit: 'day', value: Math.floor(hours / 24) };
}
/** Local `YYYY-MM-DD` of a date. */
export function localSnoozeDate(date) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
/** Local `HH:MM` of a date. */
export function localSnoozeTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
/** Resolve local calendar input or elapsed time, rejecting past, invalid, and DST-nonexistent times. */
export function resolveCustomSnooze(input, now) {
    let wake;
    if (input.mode === 'duration') {
        const amount = Number(input.amount);
        if (!Number.isFinite(amount) || amount <= 0)
            return null;
        const unitMs = { minutes: MINUTE_MS, hours: HOUR_MS, days: DAY_MS }[input.unit];
        wake = new Date(now.getTime() + amount * unitMs);
    }
    else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time))
            return null;
        wake = new Date(`${input.date}T${input.time}:00`);
        if (localSnoozeDate(wake) !== input.date || localSnoozeTime(wake) !== input.time)
            return null;
    }
    return Number.isFinite(wake.getTime()) && wake.getTime() > now.getTime() ? wake.toISOString() : null;
}
//# sourceMappingURL=logic.js.map