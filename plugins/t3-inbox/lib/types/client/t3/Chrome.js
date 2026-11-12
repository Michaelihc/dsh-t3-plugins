import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Sidebar chrome around the thread list: the compact brand name, the footer utility row
 * (undo notice plus the global panels T3 reaches from its footer), and the stylesheet
 * that hides the dsh controls the T3 header replaces.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * `SidebarBrandMark` and `SidebarChromeFooter` in
 * `apps/web/src/components/sidebar/SidebarChrome.tsx`, and
 * `apps/web/src/components/sidebar/SidebarThreadUndoNotice.tsx`.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
 */
import { useState } from 'react';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { undoSummary } from "../format.js";
import css from './Sidebar.module.css';
/**
 * dsh controls the T3 header replaces, hidden while the plugin is loaded. The selectors use
 * the sidebar's stable data attributes, never its hashed class names: the New Session button
 * follows the logo row that holds `[data-sidebar-toggle]`, and the global panel list is the
 * scroll viewport's `nav`. The panels stay reachable from the footer utility row.
 */
export const CHROME_CSS = `
div[data-window-drag]:has([data-sidebar-toggle]) + button,
div[data-window-drag]:has([data-sidebar-toggle]) + div[data-window-drag] + button,
[data-sidebar-scrollport] > nav {
  display: none !important;
}
/* T3's compact top row (Web only; desktop window chrome keeps its own geometry). */
html:not([data-platform]):not([data-windows-titlebar]) div[data-window-drag]:has([data-sidebar-toggle]) {
  height: 40px !important;
  padding-block: 4px !important;
}
`;
/**
 * T3 `SidebarBrandMark`: a bold short mark and a muted product word, tracking-tight.
 * @returns the brand name.
 */
export function BrandName({ t }) {
    return (_jsxs("span", { className: css.brand, children: [_jsx("span", { className: css.brandMark, children: t('brand.mark') }), _jsx("span", { className: css.brandName, children: t('brand.name') })] }));
}
/**
 * T3 `SidebarThreadUndoNotice`: "Settled 2, Undo"; the last text stays while it fades out,
 * then unmounts on transitionend.
 */
function UndoNotice({ notice, t }) {
    const summary = notice === null ? null : undoSummary(notice.action, notice.count, t);
    const [shown, setShown] = useState(summary);
    if (summary !== null && summary !== shown)
        setShown(summary);
    const text = summary ?? shown;
    if (text === null)
        return _jsx("span", { className: css.flex1 });
    return (_jsxs("div", { className: `${css.undo} ${summary === null ? css.undoHidden : ''}`, "aria-hidden": summary === null, ...summary === null ? { inert: '' } : {}, "data-testid": "t3-inbox-undo", onTransitionEnd: (event) => { if (summary === null && event.target === event.currentTarget)
            setShown(null); }, children: [_jsx("button", { type: "button", className: css.undoButton, onClick: () => { notice?.undo(); }, children: t('undo.button') }), _jsxs("span", { children: [text, t('undo.separator')] })] }));
}
/**
 * T3 `SidebarChromeFooter` utility row: the undo notice fills the free space, and icon
 * buttons open the global panels (Plugins, Automation tasks) the dsh panel list showed.
 * @param props - footer owner share, factory renderer, and the injected share.
 * @returns the row.
 */
export function FooterUtilities({ t, wide, useNotice, usePanels, usePanelInfo, selectPanel, renderFactorySlot }) {
    const notice = useNotice(value => value);
    const panels = usePanels(value => value);
    const activePanel = usePanelInfo(info => info.activePanelId);
    return (_jsxs("div", { className: `${css.tokens} ${css.footerRow} ${wide ? '' : css.footerRail}`, "data-testid": "t3-inbox-footer", children: [wide && _jsx(UndoNotice, { notice: notice, t: t }), _jsx("div", { className: css.footerIcons, children: panels.map(panel => (_jsx(Tooltip, { label: panel.label, side: wide ? 'top' : 'right', delayMs: 150, portal: true, children: _jsx("button", { type: "button", "aria-label": panel.label, "aria-current": activePanel === panel.id ? 'page' : undefined, className: `${css.headerIcon} ${activePanel === panel.id ? css.headerIconActive : ''}`, onClick: () => { selectPanel(panel.id); }, children: renderFactorySlot('sidebar.panel.icon', { id: panel.id, size: 16, active: activePanel === panel.id }) }) }, panel.id))) })] }));
}
//# sourceMappingURL=Chrome.js.map