import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ContextMenuTarget } from '@deepseek-ai/dsh-client-ui-context-menu/client';
import type { InboxActions } from '../actions.ts';
import type { RenameRequest } from '../menu.ts';
import type { InboxPrefs, InboxProject } from '../model.ts';
import type { InboxView } from '../view.ts';
/** Sidebar share: the derived view, preferences, and commands. */
export type InboxSidebarInjected = {
    hooks: {
        inbox: HostObservable<InboxView>;
        current: HostObservable<string | null>;
        prefs: HostObservable<InboxPrefs>;
        projects: HostObservable<readonly InboxProject[]>;
        renaming: HostObservable<RenameRequest | null>;
    };
    actions: InboxActions;
    setPrefs: (patch: Partial<InboxPrefs>) => void;
    setRenaming: (request: RenameRequest | null) => void;
    openMenu: (target: ContextMenuTarget, point: {
        x: number;
        y: number;
    }) => void;
    /** Content search over Session messages; resolves matching Session ids. */
    searchContent: (query: string, signal: AbortSignal) => Promise<readonly string[]>;
};
/** Props of the sidebar section occupant. */
export type InboxSidebarProps = PropsRuntime<'sidebar.workspaces'> & InjectFace<InboxSidebarInjected> & PropsLocale<'t3Inbox'>;
/**
 * Render the thread list.
 * @param props - sidebar owner share, scroller binding, and the injected share.
 * @returns the section.
 */
export declare function InboxSidebar(props: InboxSidebarProps): import("react").JSX.Element;
//# sourceMappingURL=Sidebar.d.ts.map