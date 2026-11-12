/**
 * Sidebar commands over the inbox Remote and the Workspace and Session services,
 * plus the undo notice. The notice follows T3 Code's `showThreadUndoNotice`
 * (`apps/web/src/hooks/showThreadUndoNotice.ts`, commit 4c8eb1dfd5): same-action
 * entries group into one "Settled 2" summary, and the group expires after 5s.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ObservableSnapshot, type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InboxModel, InboxRemote } from './model.ts';
/** The Session the custom snooze dialog is choosing a wake time for. */
export interface CustomSnoozeRequest {
    readonly sessionId: string;
}
/** T3 undo notice actions this port produces. */
export type UndoAction = 'settled' | 'snoozed' | 'unpinned' | 'archived';
/** The footer's undo notice. */
export interface UndoNotice {
    readonly action: UndoAction;
    readonly count: number;
    readonly undo: () => void;
}
/** Every sidebar command; each one has its reverse. */
export interface InboxActions {
    settle: (sessionId: string) => void;
    unsettle: (sessionId: string) => void;
    snooze: (sessionId: string, snoozedUntil: string) => void;
    /** T3 "Wake thread". */
    unsnooze: (sessionId: string) => void;
    setAutoSettle: (sessionId: string, enabled: boolean) => void;
    pin: (sessionId: string) => void;
    unpin: (sessionId: string) => void;
    archive: (sessionId: string) => void;
    rename: (sessionId: string, title: string) => void;
    open: (sessionId: string) => void;
    /** T3 "Dismiss Woke notification": mark the Session seen without opening it. */
    acknowledgeWoke: (sessionId: string) => void;
    /** Start a Session in a Workspace, or the default one. */
    newThread: (workspaceId?: string) => void;
    addProject: () => void;
    /** Ask the custom snooze dialog for a wake time; resolves with it, or null when cancelled. */
    requestCustomSnooze: (sessionId: string) => void;
    /** Copy text and confirm it with the shared toast. */
    copy: (text: string, label: 'path' | 'threadId') => void;
    /** Report a failed command with the shared toast. */
    fail: (message: string) => void;
}
/**
 * Build sidebar commands.
 * @param ctx - plugin context owning menus, sessions, and navigation.
 * @param remote - generated `inbox` Remote namespace.
 * @param model - inbox model for optimistic edits.
 * @returns commands, the custom snooze request store, and the undo notice.
 */
export declare function createInboxActions(ctx: Context, remote: InboxRemote, model: InboxModel): {
    readonly actions: InboxActions;
    readonly customRequest: SnapshotStore<CustomSnoozeRequest | null>;
    readonly undoNotice: ObservableSnapshot<UndoNotice | null>;
    readonly undoLatest: () => boolean;
};
//# sourceMappingURL=actions.d.ts.map