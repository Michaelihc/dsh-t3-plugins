/**
 * Browser half of the experimental inbox: a T3 Code Sidebar V2 thread list that shadows
 * the Workspace browser in `sidebar.workspaces`, its row menu, the T3 brand name, the
 * undo notice in the sidebar footer, and the custom snooze dialog. Unloading the plugin
 * withdraws every registration, so the native Workspace browser returns.
 *
 * The face mounts its own generated `inbox` Remote before registering any surface,
 * because every surface reads the overlay stream through it.
 */
import type { Context } from '@deepseek-ai/cordis';
export type { InboxSidebarInjected, InboxSidebarProps } from './t3/Sidebar.tsx';
export type { CustomSnoozeInjected } from './CustomSnoozeDialog.tsx';
export type { FooterUtilitiesInjected } from './t3/Chrome.tsx';
export type { InboxView, InboxRow, InboxSessionInput, InboxSection, InboxStatus } from './view.ts';
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        /** Rename from the T3-style sidebar. */
        t3Inbox: unknown;
    }
}
/** Required client services. */
export declare const inject: string[];
/**
 * Mount the generated `inbox` Remote, then the surfaces that read it.
 * @param ctx - browser plugin context.
 * @returns disposer withdrawing the surfaces before the Remote.
 */
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map