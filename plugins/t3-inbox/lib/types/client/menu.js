import { canSnooze, pickSnoozePreset, resolveSnoozePresets } from "../logic.js";
import { presetLabel, presetWhen } from "./format.js";
/** Context-menu icon keys this plugin renders. */
export const ICON_KEYS = {
    pin: 't3-inbox.pin',
    unpin: 't3-inbox.unpin',
    settle: 't3-inbox.circle-check',
    snooze: 't3-inbox.clock',
    rename: 't3-inbox.pencil',
    filter: 't3-inbox.folder-tree',
    autoSettle: 't3-inbox.timer',
    copy: 't3-inbox.copy',
    path: 't3-inbox.folder',
    hash: 't3-inbox.hash',
    archive: 't3-inbox.archive',
    check: 't3-inbox.check',
};
/**
 * Register the row menu. Actions re-resolve while the menu is open, so a row that
 * starts running or blocks updates in place.
 * @param ctx - plugin context owning the menu registry.
 * @param model - inbox model.
 * @param actions - sidebar commands.
 * @param renaming - inline rename request store.
 */
export function registerThreadMenu(ctx, model, actions, renaming) {
    const t = ctx.locale.bind('t3Inbox');
    ctx.effect(() => ctx.contextMenus.register({
        id: 't3-inbox.thread', target: 't3Thread', order: 100,
        observe: () => [model.view, model.prefs],
        resolve: ({ sessionId }) => {
            const row = model.view.getSnapshot().byId.get(sessionId);
            if (row === undefined)
                return [];
            const presets = resolveSnoozePresets(new Date());
            const scoped = model.prefs.getSnapshot().scope;
            const filterActive = row.projectId !== null && scoped.length === 1 && scoped[0] === row.projectId;
            const items = [
                row.pinned
                    ? { id: 'unpin', label: t('action.unpin'), icon: { key: ICON_KEYS.unpin }, run: () => { actions.unpin(sessionId); } }
                    : { id: 'pin', label: t('action.pin'), icon: { key: ICON_KEYS.pin }, run: () => { actions.pin(sessionId); } },
                row.section === 'settled'
                    ? { id: 'unsettle', label: t('action.unsettle'), icon: { key: ICON_KEYS.settle }, run: () => { actions.unsettle(sessionId); } }
                    : { id: 'settle', label: t('action.settle'), icon: { key: ICON_KEYS.settle }, run: () => { actions.settle(sessionId); } },
                row.section === 'snoozed'
                    ? { id: 'unsnooze', label: t('menu.wake'), icon: { key: ICON_KEYS.snooze }, run: () => { actions.unsnooze(sessionId); } }
                    : {
                        id: 'snooze', label: t('menu.snooze'), icon: { key: ICON_KEYS.snooze }, disabled: !canSnooze(row),
                        children: [
                            ...presets.map((preset) => ({
                                id: `snooze:${preset.id}`,
                                label: `${presetLabel(preset, t)} (${presetWhen(preset, t)})`,
                                run: () => {
                                    const picked = pickSnoozePreset(presets, preset.id, new Date());
                                    if (picked === null)
                                        actions.fail(t('snooze.passed'));
                                    else
                                        actions.snooze(sessionId, picked.snoozedUntil);
                                },
                            })),
                            { id: 'snooze:custom', label: t('snooze.custom'), separatorBefore: presets.length > 0, run: () => { actions.requestCustomSnooze(sessionId); } },
                        ],
                    },
                {
                    id: 'rename', label: t('action.rename'), icon: { key: ICON_KEYS.rename }, separatorBefore: true,
                    run: () => { renaming.set({ sessionId, title: row.title }); },
                },
                ...row.projectId === null ? [] : [{ projectId: row.projectId }].map(({ projectId }) => ({
                    id: 'filter-by-project',
                    label: filterActive ? t('menu.showAllProjects') : t('menu.filterBy', { project: row.projectName ?? '' }),
                    icon: { key: ICON_KEYS.filter },
                    run: () => { model.setPrefs({ scope: filterActive ? [] : [projectId] }); },
                })),
                {
                    id: 'auto-settle', label: t('menu.autoSettle'), icon: { key: ICON_KEYS.autoSettle },
                    children: [
                        {
                            id: 'auto-settle:enabled', label: t('menu.enabled'),
                            ...row.autoSettleEnabled ? { icon: { key: ICON_KEYS.check } } : {},
                            run: () => { actions.setAutoSettle(sessionId, true); },
                        },
                        {
                            id: 'auto-settle:disabled', label: t('menu.disabled'),
                            ...row.autoSettleEnabled ? {} : { icon: { key: ICON_KEYS.check } },
                            run: () => { actions.setAutoSettle(sessionId, false); },
                        },
                    ],
                },
                {
                    id: 'copy', label: t('menu.copy'), icon: { key: ICON_KEYS.copy }, separatorBefore: true,
                    children: [
                        ...row.cwd === null ? [] : [row.cwd].map(cwd => ({
                            id: 'copy-path', label: t('menu.path'), icon: { key: ICON_KEYS.path }, run: () => { actions.copy(cwd, 'path'); },
                        })),
                        { id: 'copy-thread-id', label: t('menu.threadId'), icon: { key: ICON_KEYS.hash }, run: () => { actions.copy(sessionId, 'threadId'); } },
                    ],
                },
                {
                    id: 'archive', label: t('action.archive'), icon: { key: ICON_KEYS.archive }, disabled: row.running, separatorBefore: true,
                    run: () => { actions.archive(sessionId); },
                },
            ];
            return items;
        },
    }), 't3-inbox: thread menu');
}
//# sourceMappingURL=menu.js.map