import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
const UNDO_EXPIRY_MS = 5_000;
/**
 * Build sidebar commands.
 * @param ctx - plugin context owning menus, sessions, and navigation.
 * @param remote - generated `inbox` Remote namespace.
 * @param model - inbox model for optimistic edits.
 * @returns commands, the custom snooze request store, and the undo notice.
 */
export function createInboxActions(ctx, remote, model) {
    const t = ctx.locale.bind('t3Inbox');
    const customRequest = createSnapshotStore(null);
    const notice = createSnapshotStore(null);
    let live = [];
    let expiry;
    ctx.effect(() => () => { clearTimeout(expiry); }, 't3-inbox: undo expiry');
    const refresh = () => {
        const latest = live.at(-1);
        if (latest === undefined) {
            notice.set(null);
            return;
        }
        const group = [];
        for (const entry of [...live].reverse()) {
            if (entry.action !== latest.action)
                break;
            group.push(entry);
        }
        notice.set({
            action: latest.action,
            count: group.length,
            undo: () => {
                live = live.filter(entry => !group.includes(entry));
                refresh();
                for (const entry of group)
                    void entry.undo().catch((error) => { fail(t('error.undo', { message: String(error) })); });
            },
        });
    };
    const showUndo = (action, undo) => {
        live.push({ action, undo });
        refresh();
        clearTimeout(expiry);
        expiry = setTimeout(() => { live = []; refresh(); }, UNDO_EXPIRY_MS);
    };
    const fail = (message) => { ctx.contextMenus.notify(message, false); };
    const report = (result, failure) => {
        if (result.ok)
            return true;
        fail(result.error?.code === 'inbox/needs-attention'
            ? t('error.needsAttention')
            : t(failure, { message: result.error?.message ?? t('error.unknown') }));
        return false;
    };
    const restore = (sessionId, before) => async () => {
        const result = await model.optimistic(sessionId, () => before ?? null, () => remote.restore(sessionId, before ?? null));
        report(result, 'error.undo');
    };
    const now = () => new Date().toISOString();
    const workspace = () => ctx.get('uiWorkspace');
    const actions = {
        settle: (sessionId) => {
            const before = model.record(sessionId);
            void model.optimistic(sessionId, record => ({
                settledAt: now(), settleReason: 'manual', unsettledAt: null, snoozedUntil: null, snoozedAt: null,
                ...record?.autoSettleDisabled === true ? { autoSettleDisabled: true } : {},
            }), () => remote.settle(sessionId)).then((result) => {
                if (report(result, 'error.settle'))
                    showUndo('settled', restore(sessionId, before));
            });
        },
        unsettle: (sessionId) => {
            void model.optimistic(sessionId, record => ({
                snoozedUntil: null, snoozedAt: null, ...record, settledAt: null, settleReason: null, unsettledAt: now(),
            }), () => remote.unsettle(sessionId)).then((result) => { report(result, 'error.unsettle'); });
        },
        snooze: (sessionId, snoozedUntil) => {
            const before = model.record(sessionId);
            void model.optimistic(sessionId, record => ({
                unsettledAt: null, ...record, settledAt: null, settleReason: null, snoozedUntil, snoozedAt: now(),
            }), () => remote.snooze(sessionId, snoozedUntil)).then((result) => {
                if (report(result, 'error.snooze'))
                    showUndo('snoozed', restore(sessionId, before));
            });
        },
        unsnooze: (sessionId) => {
            void model.optimistic(sessionId, record => ({
                settledAt: null, settleReason: null, unsettledAt: null, ...record, snoozedUntil: null, snoozedAt: null,
            }), () => remote.unsnooze(sessionId)).then((result) => { report(result, 'error.wake'); });
        },
        setAutoSettle: (sessionId, enabled) => {
            void model.optimistic(sessionId, record => ({
                settledAt: null, settleReason: null, unsettledAt: null, snoozedUntil: null, snoozedAt: null,
                ...record, autoSettleDisabled: !enabled,
            }), () => remote.setAutoSettle(sessionId, enabled)).then((result) => { report(result, 'error.autoSettle'); });
        },
        pin: (sessionId) => {
            workspace()?.pinSession(sessionId).catch((error) => { fail(t('error.pin', { message: String(error) })); });
        },
        unpin: (sessionId) => {
            const service = workspace();
            service?.unpinSession(sessionId).then(() => { showUndo('unpinned', () => service.pinSession(sessionId)); }, (error) => { fail(t('error.unpin', { message: String(error) })); });
        },
        archive: (sessionId) => {
            const service = workspace();
            service?.archiveSession(sessionId).then(() => { showUndo('archived', () => service.unarchiveSession(sessionId)); }, (error) => { fail(t('error.archive', { message: String(error) })); });
        },
        rename: (sessionId, title) => {
            void ctx.sessions.using(sessionId, { source: 't3Inbox' }, reference => reference.binding.session.rename(title))
                .then((result) => { if (!result.ok)
                fail(t('error.rename', { message: result.error.message })); }, (error) => { fail(t('error.rename', { message: String(error) })); });
        },
        open: (sessionId) => { workspace()?.openSession(sessionId); },
        acknowledgeWoke: (sessionId) => { model.markVisited(sessionId); },
        newThread: (workspaceId) => { workspace()?.startSession(workspaceId); },
        addProject: () => {
            const service = workspace();
            const workspaces = ctx.get('workspaces');
            if (service === undefined || workspaces === undefined)
                return;
            void service.pickDirectory().then(async (path) => {
                if (path === null)
                    return;
                const created = await workspaces.create({ path });
                service.startSession(created.workspaceId);
            }).catch((error) => { fail(t('error.addProject', { message: String(error) })); });
        },
        requestCustomSnooze: (sessionId) => { customRequest.set({ sessionId }); },
        copy: (text, label) => {
            const named = t(label === 'path' ? 'copy.label.path' : 'copy.label.threadId');
            void navigator.clipboard.writeText(text).then(() => { ctx.contextMenus.notify(t('toast.copied', { label: named }), true); }, () => { fail(t('toast.copyFailed', { label: named })); });
        },
        fail,
    };
    const undoLatest = () => {
        const current = notice.getSnapshot();
        if (current === null)
            return false;
        current.undo();
        return true;
    };
    return { actions, customRequest, undoNotice: notice, undoLatest };
}
//# sourceMappingURL=actions.js.map