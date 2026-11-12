/**
 * Locale-aware text for the inbox: relative times, snooze preset names, and undo summaries.
 * Units and clock times come from `Intl` with the dictionary's `time.locale`, so Chinese shows
 * "29分钟" where English shows "29m".
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { RelativeTime, SnoozePreset, TimeAmount } from '../logic.ts';
import type { UndoAction } from './actions.ts';
/** Translator of the `t3Inbox` namespace. */
export type InboxTranslate = TranslateNS<'t3Inbox'>;
/**
 * One amount in the active language's narrow unit form (`29m`, `29分钟`).
 * @param amount - value and unit.
 * @param t - namespace translator, for its `time.locale`.
 * @returns the formatted amount.
 */
export declare function formatAmount(amount: TimeAmount, t: InboxTranslate): string;
/**
 * A relative time, or "now".
 * @param time - amount or the moment itself.
 * @param t - namespace translator.
 * @returns the label.
 */
export declare function formatRelative(time: RelativeTime, t: InboxTranslate): string;
/**
 * Several amounts, largest first (`1h 5m`).
 * @param parts - amounts in display order.
 * @param t - namespace translator.
 * @returns the joined label.
 */
export declare function formatParts(parts: readonly TimeAmount[], t: InboxTranslate): string;
/**
 * The name of a snooze preset ("In 1 hour", "Tomorrow").
 * @param preset - resolved preset.
 * @param t - namespace translator.
 * @returns the label.
 */
export declare function presetLabel(preset: SnoozePreset, t: InboxTranslate): string;
/**
 * The wake time next to a preset name: the clock time, with the weekday when the name omits it.
 * @param preset - resolved preset.
 * @param t - namespace translator.
 * @returns the label.
 */
export declare function presetWhen(preset: SnoozePreset, t: InboxTranslate): string;
/**
 * The undo notice text: "Settled" for one, "Settled 2" for a group.
 * @param action - what was done.
 * @param count - how many entries the notice groups.
 * @param t - namespace translator.
 * @returns the label.
 */
export declare function undoSummary(action: UndoAction, count: number, t: InboxTranslate): string;
//# sourceMappingURL=format.d.ts.map