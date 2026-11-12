/**
 * One amount in the active language's narrow unit form (`29m`, `29分钟`).
 * @param amount - value and unit.
 * @param t - namespace translator, for its `time.locale`.
 * @returns the formatted amount.
 */
export function formatAmount(amount, t) {
    return new Intl.NumberFormat(t('time.locale'), { style: 'unit', unit: amount.unit, unitDisplay: 'narrow' }).format(amount.value);
}
/**
 * A relative time, or "now".
 * @param time - amount or the moment itself.
 * @param t - namespace translator.
 * @returns the label.
 */
export function formatRelative(time, t) {
    return time.unit === 'now' ? t('time.now') : formatAmount(time, t);
}
/**
 * Several amounts, largest first (`1h 5m`).
 * @param parts - amounts in display order.
 * @param t - namespace translator.
 * @returns the joined label.
 */
export function formatParts(parts, t) {
    return parts.map(part => formatAmount(part, t)).join(' ');
}
const PRESET_KEYS = {
    morning: 'snooze.morning', afternoon: 'snooze.afternoon', evening: 'snooze.evening',
    tomorrow: 'snooze.tomorrow', nextWeek: 'snooze.nextWeek',
};
/**
 * The name of a snooze preset ("In 1 hour", "Tomorrow").
 * @param preset - resolved preset.
 * @param t - namespace translator.
 * @returns the label.
 */
export function presetLabel(preset, t) {
    const { name } = preset;
    if (name.kind !== 'after')
        return t(PRESET_KEYS[name.kind]);
    const { unit, value } = name.amount;
    const form = value === 1 ? 'one' : 'other';
    return t(`snooze.in.${unit === 'day' ? 'day' : unit === 'hour' ? 'hour' : 'minute'}.${form}`, { count: value });
}
/**
 * The wake time next to a preset name: the clock time, with the weekday when the name omits it.
 * @param preset - resolved preset.
 * @param t - namespace translator.
 * @returns the label.
 */
export function presetWhen(preset, t) {
    const locale = t('time.locale');
    const time = preset.wakeAt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    return preset.showsDay ? `${preset.wakeAt.toLocaleDateString(locale, { weekday: 'short' })} ${time}` : time;
}
/**
 * The undo notice text: "Settled" for one, "Settled 2" for a group.
 * @param action - what was done.
 * @param count - how many entries the notice groups.
 * @param t - namespace translator.
 * @returns the label.
 */
export function undoSummary(action, count, t) {
    const form = count === 1 ? 'one' : 'other';
    return t(`undo.${action}.${form}`, { count });
}
//# sourceMappingURL=format.js.map