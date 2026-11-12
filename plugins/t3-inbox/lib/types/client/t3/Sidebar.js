import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The T3-style thread list that replaces the Workspace browser in `sidebar.workspaces`:
 * the Search header row, Pinned and Active cards, then the collapsible Working,
 * Snoozed, and Settled shelves at the foot of the list.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * the thread list of `apps/web/src/components/Sidebar.tsx`,
 * `sidebar/SidebarThreadHeader.tsx`, `sidebar/SidebarListMarkers.tsx`
 * (`SidebarSectionHeader`), and `ui/collapsible-section-header.tsx`. Drag and drop,
 * project folders, drafts, and jump hints are not ported; see PORTING.md.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Menu, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { ChevronDownIcon, FolderIcon, FolderPlusIcon, ListFilterIcon, SearchIcon, SquarePenIcon, XIcon } from "./icons.js";
import { ThreadRow } from "./ThreadRow.js";
import css from './Sidebar.module.css';
/** T3 `SETTLED_TAIL_INITIAL_COUNT` and `SETTLED_TAIL_PAGE_COUNT`. */
const SETTLED_TAIL_INITIAL_COUNT = 10;
const SETTLED_TAIL_PAGE_COUNT = 25;
function cx(...names) {
    return names.filter(Boolean).join(' ');
}
/** T3 `SidebarHeaderIconButton`. */
function HeaderIconButton({ label, children, onClick, active, buttonRef }) {
    return (_jsx(Tooltip, { label: label, side: "top", delayMs: 150, portal: true, children: _jsx("button", { ref: buttonRef, type: "button", "aria-label": label, className: cx(css.headerIcon, active && css.headerIconActive), onClick: onClick, children: children }) }));
}
/** T3 `SidebarSectionHeader` over `CollapsibleSectionHeader`. */
function ShelfHeader({ id, label, count, expanded, onToggle, pushDown }) {
    return (_jsx("li", { className: cx(css.shelfItem, pushDown && css.mtAuto), "data-testid": `sidebar-${id}-header`, children: _jsxs("button", { type: "button", "aria-expanded": expanded, className: css.shelfButton, onClick: onToggle, children: [_jsx("span", { className: css.shelfLabel, children: label }), _jsx("span", { "aria-hidden": true, className: css.shelfRule }), _jsx("span", { className: css.shelfCount, children: count }), _jsx(ChevronDownIcon, { "aria-hidden": true, className: cx(css.size3, css.shelfChevron, !expanded && css.shelfChevronClosed) })] }) }));
}
/** A collapsed shelf still shows the open thread (T3 `routeThreadOnly`). */
function routeOnly(rows, current) {
    return rows.filter(row => row.id === current);
}
/** Rail (collapsed sidebar): the compose and search entry points. */
function Rail({ actions, expandSidebar, t }) {
    return (_jsxs("div", { className: css.rail, children: [_jsx(HeaderIconButton, { label: t('rail.search'), onClick: expandSidebar, children: _jsx(SearchIcon, { className: css.size4 }) }), _jsx(HeaderIconButton, { label: t('header.newThread'), onClick: () => { actions.newThread(); }, children: _jsx(SquarePenIcon, { className: css.size4 }) })] }));
}
const noSectionScroller = () => ({ bindScrollerRef: undefined });
/**
 * Render the thread list.
 * @param props - sidebar owner share, scroller binding, and the injected share.
 * @returns the section.
 */
export function InboxSidebar(props) {
    const { t, wide, expandSidebar, useSectionScroller, useInbox, useCurrent, usePrefs, useProjects, useRenaming, actions } = props;
    const view = useInbox(value => value);
    const current = useCurrent(value => value);
    const prefs = usePrefs(value => value);
    const projects = useProjects(value => value);
    const renaming = useRenaming(value => value);
    // Published dsh 0.2.2-rc.1 does not pass a section scroller; the list then scrolls on its own.
    const { bindScrollerRef } = (useSectionScroller ?? noSectionScroller)();
    const [query, setQuery] = useState('');
    const [contentMatches, setContentMatches] = useState([]);
    const [activeResult, setActiveResult] = useState(0);
    const [scopeOpen, setScopeOpen] = useState(false);
    const [settledCount, setSettledCount] = useState(SETTLED_TAIL_INITIAL_COUNT);
    const searchInput = useRef(null);
    const root = useRef(null);
    const trimmed = query.trim();
    const searching = trimmed !== '';
    // The shelves sit at the foot of the visible list, as in T3: fill the viewport below the navigation.
    useLayoutEffect(() => {
        const element = root.current;
        const port = element?.closest('[data-sidebar-scrollport]');
        if (element == null || port == null)
            return;
        const measure = () => {
            const top = element.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
            element.style.setProperty('--t3-fill', `${Math.max(0, port.clientHeight - top)}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(port);
        return () => { observer.disconnect(); };
    }, [wide]);
    useEffect(() => {
        setContentMatches([]);
        if (!searching)
            return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            props.searchContent(trimmed, controller.signal).then(setContentMatches, () => { });
        }, 150);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [trimmed, searching, props.searchContent]);
    const results = useMemo(() => {
        if (!searching)
            return [];
        const needle = trimmed.toLocaleLowerCase();
        const all = [...view.pinned, ...view.active, ...view.working, ...view.snoozed, ...view.settled];
        const content = new Set(contentMatches);
        return all.filter(row => row.title.toLocaleLowerCase().includes(needle) || content.has(row.id));
    }, [searching, trimmed, view, contentMatches]);
    const onContextMenu = (row, point) => {
        props.openMenu({ kind: 't3Thread', value: { sessionId: row.id, title: row.title } }, point);
    };
    const rowProps = (row, variant) => ({
        key: row.id,
        t,
        row,
        variant,
        isActive: row.id === current,
        isRenaming: renaming?.sessionId === row.id,
        actions,
        onContextMenu,
        onStartRename: (target) => { props.setRenaming({ sessionId: target.id, title: target.title }); },
        onCancelRename: () => { props.setRenaming(null); },
    });
    if (!wide)
        return _jsx(Rail, { actions: actions, expandSidebar: expandSidebar, t: t });
    const onSearchKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setQuery('');
            return;
        }
        if (!searching || results.length === 0)
            return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActiveResult(index => (index + step + results.length) % results.length);
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            const row = results[Math.min(activeResult, results.length - 1)];
            if (row !== undefined)
                actions.open(row.id);
        }
    };
    const scoped = projects.filter(project => prefs.scope.includes(project.id));
    const scopeItems = [
        { id: 'all', label: t('filter.all') },
        ...projects.length > 0 ? [{ type: 'separator', id: 'sep' }] : [],
        ...projects.map(project => ({ id: project.id, label: project.name, icon: _jsx(FolderIcon, { className: css.size4 }) })),
    ];
    const workingRows = prefs.workingExpanded ? view.working : routeOnly(view.working, current);
    const snoozedRows = prefs.snoozedExpanded ? view.snoozed : routeOnly(view.snoozed, current);
    const visibleSettled = view.settled.slice(0, settledCount);
    if (current !== null && !visibleSettled.some(row => row.id === current)) {
        const open = view.settled.find(row => row.id === current);
        if (open !== undefined)
            visibleSettled.push(open);
    }
    const settledRows = prefs.settledExpanded ? visibleSettled : routeOnly(view.settled, current);
    const hiddenSettled = Math.max(0, view.settled.length - visibleSettled.length);
    const total = view.pinned.length + view.active.length + view.working.length + view.snoozed.length + view.settled.length;
    return (_jsxs("div", { ref: root, className: css.root, "data-testid": "t3-inbox-sidebar", children: [_jsxs("div", { className: css.header, children: [_jsxs("div", { className: css.searchBox, children: [_jsx(SearchIcon, { className: cx(css.size4, css.searchIcon) }), _jsx("input", { ref: searchInput, type: "search", className: css.searchInput, value: query, placeholder: t('search.placeholder'), "aria-label": t('search.aria'), role: "combobox", "aria-autocomplete": "list", "aria-expanded": searching && results.length > 0, "aria-controls": searching && results.length > 0 ? 't3-inbox-search-results' : undefined, "aria-activedescendant": searching && activeResult < results.length ? `t3-inbox-search-result-${activeResult}` : undefined, onChange: (event) => { setQuery(event.currentTarget.value); setActiveResult(0); }, onKeyDown: onSearchKeyDown }), searching && (_jsx("button", { type: "button", className: css.clearSearch, "aria-label": t('search.clear'), onClick: () => { setQuery(''); searchInput.current?.focus(); }, children: _jsx(XIcon, { className: css.size3 }) }))] }), _jsxs("div", { className: css.headerIcons, children: [projects.length > 0 && (_jsx(Menu, { open: scopeOpen, portal: true, align: "start", items: scopeItems, selectedIds: prefs.scope.length === 0 ? ['all'] : prefs.scope, onClose: () => { setScopeOpen(false); }, onSelect: (id) => {
                                    setScopeOpen(false);
                                    props.setPrefs({ scope: id === 'all' ? [] : [id] });
                                }, anchor: (_jsx(HeaderIconButton, { label: scoped.length > 0 ? t('filter.ariaActive', { projects: scoped.map(project => project.name).join(', ') }) : t('filter.aria'), active: scoped.length > 0, onClick: () => { setScopeOpen(open => !open); }, children: scoped.length > 0 ? _jsx(FolderIcon, { className: css.size4 }) : _jsx(ListFilterIcon, { className: css.size4 }) })) })), projects.length > 0 && (_jsx(HeaderIconButton, { label: t('header.addProject'), onClick: actions.addProject, children: _jsx(FolderPlusIcon, { className: css.size4 }) })), _jsx(HeaderIconButton, { label: t('header.newThread'), onClick: () => { actions.newThread(scoped.length === 1 ? scoped[0]?.id : undefined); }, children: _jsx(SquarePenIcon, { className: css.size4 }) })] })] }), _jsx("div", { ref: bindScrollerRef, className: css.listArea, "data-sidebar-list-area": "", children: searching
                    ? (results.length > 0
                        ? (_jsx("ul", { id: "t3-inbox-search-results", role: "listbox", "aria-label": t('search.results'), className: css.searchList, children: results.map((row, index) => (_jsx(ThreadRow, { ...rowProps(row, 'slim'), option: { id: `t3-inbox-search-result-${index}`, selected: index === activeResult, onHighlight: () => { setActiveResult(index); } } }))) }))
                        : _jsx("p", { role: "status", className: css.searchEmpty, children: t('search.empty') }))
                    : total === 0
                        ? (_jsx("div", { className: css.empty, children: scoped.length > 1
                                ? t('empty.projects')
                                : scoped[0] !== undefined ? t('empty.project', { project: scoped[0].name }) : t('empty.none') }))
                        : (_jsxs("ul", { role: "presentation", className: css.list, children: [view.pinned.map(row => _jsx(ThreadRow, { ...rowProps(row, 'card') })), view.active.map(row => _jsx(ThreadRow, { ...rowProps(row, 'card') })), view.working.length > 0 && (_jsx(ShelfHeader, { id: "working", label: t('shelf.working'), count: view.working.length, expanded: prefs.workingExpanded, pushDown: true, onToggle: () => { props.setPrefs({ workingExpanded: !prefs.workingExpanded }); } })), workingRows.map(row => _jsx(ThreadRow, { ...rowProps(row, 'card') })), view.snoozed.length > 0 && (_jsx(ShelfHeader, { id: "snoozed", label: t('shelf.snoozed'), count: view.snoozed.length, expanded: prefs.snoozedExpanded, pushDown: view.working.length === 0, onToggle: () => { props.setPrefs({ snoozedExpanded: !prefs.snoozedExpanded }); } })), snoozedRows.map(row => _jsx(ThreadRow, { ...rowProps(row, 'slim') })), _jsx(ShelfHeader, { id: "settled", label: t('shelf.settled'), count: view.settled.length, expanded: prefs.settledExpanded, pushDown: view.working.length + view.snoozed.length === 0, onToggle: () => {
                                        props.setPrefs({ settledExpanded: !prefs.settledExpanded });
                                        setSettledCount(SETTLED_TAIL_INITIAL_COUNT);
                                    } }), settledRows.map(row => _jsx(ThreadRow, { ...rowProps(row, 'slim') })), prefs.settledExpanded && hiddenSettled > 0 && (_jsx("li", { className: css.listItem, children: _jsxs("button", { type: "button", className: css.showMore, onClick: () => { setSettledCount(count => count + SETTLED_TAIL_PAGE_COUNT); }, children: [_jsx(ChevronDownIcon, { "aria-hidden": true, className: css.size4 }), t('shelf.showMore', { count: Math.min(hiddenSettled, SETTLED_TAIL_PAGE_COUNT) })] }) }))] })) })] }));
}
//# sourceMappingURL=Sidebar.js.map