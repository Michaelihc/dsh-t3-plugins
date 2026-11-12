import type { HostObservable, InjectFace, PropsLocale, PropsRenderFactories, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { UndoNotice as UndoNoticeValue } from '../actions.ts';
/**
 * dsh controls the T3 header replaces, hidden while the plugin is loaded. The selectors use
 * the sidebar's stable data attributes, never its hashed class names: the New Session button
 * follows the logo row that holds `[data-sidebar-toggle]`, and the global panel list is the
 * scroll viewport's `nav`. The panels stay reachable from the footer utility row.
 */
export declare const CHROME_CSS = "\ndiv[data-window-drag]:has([data-sidebar-toggle]) + button,\ndiv[data-window-drag]:has([data-sidebar-toggle]) + div[data-window-drag] + button,\n[data-sidebar-scrollport] > nav {\n  display: none !important;\n}\n/* T3's compact top row (Web only; desktop window chrome keeps its own geometry). */\nhtml:not([data-platform]):not([data-windows-titlebar]) div[data-window-drag]:has([data-sidebar-toggle]) {\n  height: 40px !important;\n  padding-block: 4px !important;\n}\n";
/**
 * T3 `SidebarBrandMark`: a bold short mark and a muted product word, tracking-tight.
 * @returns the brand name.
 */
export declare function BrandName({ t }: PropsRuntime<'sidebar.brand.name'> & PropsLocale<'t3Inbox'>): import("react").JSX.Element;
/** One global panel the footer links to. */
export interface FooterPanel {
    readonly id: string;
    readonly label: string;
}
/** Footer share: the undo notice, the registered panels, and panel selection. */
export type FooterUtilitiesInjected = {
    hooks: {
        notice: HostObservable<UndoNoticeValue | null>;
        panels: HostObservable<readonly FooterPanel[]>;
    };
    selectPanel: (id: string) => void;
};
type FooterProps = PropsRuntime<'sidebar.footer.action'> & PropsRenderFactories & InjectFace<FooterUtilitiesInjected> & PropsLocale<'t3Inbox'>;
/**
 * T3 `SidebarChromeFooter` utility row: the undo notice fills the free space, and icon
 * buttons open the global panels (Plugins, Automation tasks) the dsh panel list showed.
 * @param props - footer owner share, factory renderer, and the injected share.
 * @returns the row.
 */
export declare function FooterUtilities({ t, wide, useNotice, usePanels, usePanelInfo, selectPanel, renderFactorySlot }: FooterProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Chrome.d.ts.map