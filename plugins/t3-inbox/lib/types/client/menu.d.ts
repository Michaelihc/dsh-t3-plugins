/**
 * The thread row menu, in T3 Code's order: `buildThreadActionMenuItems` in
 * `apps/web/src/components/threadActionMenu.logic.ts` (commit 4c8eb1dfd5).
 * Items the Harness has no equivalent for are left out; PORTING.md lists them.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InboxActions } from './actions.ts';
import type { InboxModel } from './model.ts';
declare module '@deepseek-ai/dsh-client-ui-context-menu/client' {
    interface ContextMenuTargetMap {
        /** One row of the T3-style sidebar. */
        t3Thread: {
            readonly sessionId: string;
            readonly title: string;
        };
    }
}
/** Inline rename the sidebar shows, started from the menu or F2. */
export interface RenameRequest {
    readonly sessionId: string;
    readonly title: string;
}
/** Context-menu icon keys this plugin renders. */
export declare const ICON_KEYS: {
    readonly pin: "t3-inbox.pin";
    readonly unpin: "t3-inbox.unpin";
    readonly settle: "t3-inbox.circle-check";
    readonly snooze: "t3-inbox.clock";
    readonly rename: "t3-inbox.pencil";
    readonly filter: "t3-inbox.folder-tree";
    readonly autoSettle: "t3-inbox.timer";
    readonly copy: "t3-inbox.copy";
    readonly path: "t3-inbox.folder";
    readonly hash: "t3-inbox.hash";
    readonly archive: "t3-inbox.archive";
    readonly check: "t3-inbox.check";
};
/**
 * Register the row menu. Actions re-resolve while the menu is open, so a row that
 * starts running or blocks updates in place.
 * @param ctx - plugin context owning the menu registry.
 * @param model - inbox model.
 * @param actions - sidebar commands.
 * @param renaming - inline rename request store.
 */
export declare function registerThreadMenu(ctx: Context, model: InboxModel, actions: InboxActions, renaming: SnapshotStore<RenameRequest | null>): void;
//# sourceMappingURL=menu.d.ts.map