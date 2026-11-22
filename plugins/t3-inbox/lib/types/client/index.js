import inboxRemote from '@deepseek-ai/dsh-experimental-t3-inbox/remote';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { createInboxActions } from "./actions.js";
import { CustomSnoozeDialog } from "./CustomSnoozeDialog.js";
import { ICON_KEYS, registerThreadMenu } from "./menu.js";
import { en, ja, es, fr, de, ru, pt, zh } from "./locales.js";
import { InboxModel } from "./model.js";
import { registerModelPicker } from "./modelPicker.js";
import { BrandName, CHROME_CSS, FooterUtilities } from "./t3/Chrome.js";
import { ArchiveIcon, CheckIcon, CircleCheckIcon, ClockIcon, CopyIcon, FolderIcon, FolderTreeIcon, HashIcon, PencilIcon, PinIcon, PinOffIcon, TimerIcon, menuIcon, } from "./t3/icons.js";
import { InboxSidebar } from "./t3/Sidebar.js";
import { RelatedThreads } from "./t3/RelatedThreads.js";
import { DELEGATE_TOOL, DelegationCard } from "./t3/DelegationCard.js";
/** Shadows the Workspace browser (priority 0); lower priority renders. */
const SIDEBAR_PRIORITY = -10;
/** Services the surfaces need once the Remote is mounted. */
const UI_SERVICES = ['slots', 'locale', 'contextMenus', 'sessions', 'uiSession', 'workspaces', 'layout', 'uiWorkspace'];
/** Required client services. */
export const inject = ['remote', ...UI_SERVICES];
/** Dictionary namespace owned by this plugin. */
const NS = 't3Inbox';
function registerUi(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }), 't3-inbox: dictionaries');
    const t = ctx.locale.bind(NS);
    registerModelPicker(ctx, () => t('model.nativeAgents'));
    const remote = ctx.remote.inbox;
    const model = new InboxModel(ctx, remote, {
        sessions: ctx.sessions.list,
        status: ctx.uiSession.sessionStatus,
        workspaces: ctx.workspaces.list,
        panel: ctx.layout.panelInfo,
    });
    const { actions, customRequest, undoNotice } = createInboxActions(ctx, remote, model);
    const renaming = createSnapshotStore(null);
    registerThreadMenu(ctx, model, actions, renaming);
    ctx.slots.inject('contextMenu.icon', function* () {
        for (const [key, Component] of [
            [ICON_KEYS.pin, PinIcon], [ICON_KEYS.unpin, PinOffIcon], [ICON_KEYS.settle, CircleCheckIcon], [ICON_KEYS.snooze, ClockIcon],
            [ICON_KEYS.rename, PencilIcon], [ICON_KEYS.filter, FolderTreeIcon], [ICON_KEYS.autoSettle, TimerIcon], [ICON_KEYS.copy, CopyIcon],
            [ICON_KEYS.path, FolderIcon], [ICON_KEYS.hash, HashIcon], [ICON_KEYS.archive, ArchiveIcon], [ICON_KEYS.check, CheckIcon],
        ]) {
            yield ctx.slots.register({ name: 'contextMenu.icon', key }, menuIcon(Component));
        }
    });
    ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
        name: 'sidebar.workspaces',
        priority: SIDEBAR_PRIORITY,
        locale: NS,
        inject: () => ({
            hooks: {
                inbox: model.view, current: model.current, prefs: model.prefs, projects: model.projects, renaming,
            },
            actions,
            setPrefs: (patch) => { model.setPrefs(patch); },
            setRenaming: (request) => { renaming.set(request); },
            openMenu: (target, point) => { ctx.contextMenus.open(target, point); },
            searchContent: async (query, signal) => {
                const result = await ctx.sessions.search(query, signal);
                return result.ok ? result.value.items.map(item => item.sessionId) : [];
            },
        }),
    }, InboxSidebar));
    // Subagent threads have no row; their parent and children link to each other, as T3's related threads do.
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 't3-inbox.related-threads',
        order: 5,
        locale: NS,
        inject: (sessionId) => ({
            hooks: { relations: model.relationsOf(String(sessionId)) },
            open: (id) => { actions.open(id); },
        }),
    }, RelatedThreads));
    // The orchestrator's delegate_task call reads as the delegated thread itself, as in T3's transcript.
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
        name: 'tool.call.toolview',
        key: DELEGATE_TOOL,
        locale: NS,
        inject: (sessionId) => ({
            hooks: { relations: model.relationsOf(String(sessionId)) },
            open: (id) => { actions.open(id); },
        }),
    }, DelegationCard));
    ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
        name: 'sidebar.brand.name', priority: SIDEBAR_PRIORITY, locale: NS,
    }, BrandName));
    // The global panels the hidden dsh panel list showed, read from the same registrations.
    const panels = createSnapshotStore([]);
    const syncPanels = () => {
        const next = ctx.slots.entriesOfSlot('sidebar.panellist')
            .map(({ options }) => {
            const label = options.label;
            return {
                id: String(options.id), order: Number(options.order ?? 0),
                label: typeof label === 'function' ? label() : label ?? String(options.id),
            };
        })
            .sort((left, right) => left.order - right.order)
            .map(({ id, label }) => ({ id, label }));
        const previous = panels.getSnapshot();
        const same = previous.length === next.length
            && previous.every((panel, index) => panel.id === next[index]?.id && panel.label === next[index]?.label);
        if (same)
            return;
        panels.set(next);
    };
    syncPanels();
    ctx.effect(() => ctx.slots.subscribe('sidebar.panellist', syncPanels), 't3-inbox: panel entries');
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action', id: 't3-inbox.footer', order: -100, locale: NS,
        inject: () => ({
            hooks: { notice: undoNotice, panels },
            selectPanel: (id) => { ctx.layout.selectPanel(id); },
        }),
    }, FooterUtilities));
    // Hide the dsh controls the T3 header replaces, only while this plugin is loaded.
    ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.t3Inbox = 'chrome';
        style.textContent = CHROME_CSS;
        document.head.append(style);
        return () => { style.remove(); };
    }, 't3-inbox: sidebar chrome');
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 't3-inbox.custom-snooze', locale: NS,
        inject: () => ({
            hooks: { request: customRequest },
            dismiss: () => { customRequest.set(null); },
            snooze: actions.snooze,
        }),
    }, CustomSnoozeDialog));
    // Mod+Z undoes the latest settle or snooze while the notice shows, outside text fields (T3 `thread.undo`).
    const onKey = (event) => {
        if (event.key.toLowerCase() !== 'z' || event.shiftKey || event.altKey || !(event.ctrlKey || event.metaKey))
            return;
        const target = event.target;
        if (target?.closest('input, textarea, [contenteditable="true"]') != null)
            return;
        const current = undoNotice.getSnapshot();
        if (current === null)
            return;
        event.preventDefault();
        current.undo();
    };
    ctx.effect(() => {
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); };
    }, 't3-inbox: undo shortcut');
}
/**
 * Mount the generated `inbox` Remote, then the surfaces that read it.
 * @param ctx - browser plugin context.
 * @returns disposer withdrawing the surfaces before the Remote.
 */
export async function apply(ctx) {
    const unmountRemote = await ctx.remote.$mount(inboxRemote);
    const ui = ctx.inject(['remote.inbox', ...UI_SERVICES], (scope) => { registerUi(scope); });
    try {
        await ui;
    }
    catch (error) {
        await ui.dispose();
        await unmountRemote();
        throw error;
    }
    return async () => {
        await ui.dispose();
        await unmountRemote();
    };
}
//# sourceMappingURL=index.js.map