import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Sidebar thread rows: the two-line card (Active, Pinned, Working) and the slim row
 * (Snoozed, Settled), with T3's status pill, hover actions, inline rename, and hover card.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * `apps/web/src/components/sidebar/SidebarThreadRow.tsx` (`SidebarThreadRow`,
 * `SnoozeMenuButton`, `ThreadRenameInput`, `SidebarThreadTooltip`, `TopStatusIcon`,
 * `RelativeTimeLabel`, `WorkingDuration`) and `ThreadHoverCard.tsx`. Tailwind classes
 * become CSS-module classes with the same values; Base UI tooltips and menus become
 * dsh ui-primitives. See PORTING.md for what changed.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { HoverCard, Menu, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { canSnooze, compactRelativeTime, pickSnoozePreset, resolveSnoozePresets, snoozeWakeIn, workingDurationParts, } from "../../logic.js";
import { formatParts, formatRelative, presetLabel, presetWhen } from "../format.js";
import { shouldRecede } from "../view.js";
import { hasProviderMark, ProviderMark } from "./agentMarks.js";
import { AlarmClockIcon, AlarmClockOffIcon, CheckIcon, CircleCheckIcon, CircleDashedIcon, CircleDotDashedIcon, ClockIcon, FolderIcon, GitBranchIcon, MessageCircleQuestionIcon, PinIcon, PinOffIcon, ShieldQuestionIcon, SparkleIcon, Undo2Icon, } from "./icons.js";
import css from './Sidebar.module.css';
function cx(...names) {
    return names.filter(Boolean).join(' ');
}
/** Re-render when `label(now)` would change, and never in between. */
function useTickingLabel(label, nextChange) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const delay = Math.max(50, nextChange(now) - Date.now());
        const timer = setTimeout(() => { setNow(Date.now()); }, delay);
        return () => { clearTimeout(timer); };
    }, [now, nextChange]);
    return label(now);
}
const nextMinute = (now) => (Math.floor(now / 60_000) + 1) * 60_000;
/** T3 `RelativeTimeLabel`: compact age that ticks once a minute. */
function RelativeTimeLabel({ at, t }) {
    return _jsx(_Fragment, { children: useTickingLabel(now => formatRelative(compactRelativeTime(at, now), t), nextMinute) });
}
/** T3 `WorkingDuration`: "42s", then "29m"; it re-renders only when its text changes. */
export function WorkingDuration({ startedMs, t }) {
    const next = (now) => {
        const elapsed = now - startedMs;
        return elapsed < 60_000 ? startedMs + (Math.floor(elapsed / 1000) + 1) * 1000 : startedMs + (Math.floor(elapsed / 60_000) + 1) * 60_000;
    };
    return _jsx("span", { className: css.tabular, children: useTickingLabel(now => formatParts(workingDurationParts(now - startedMs), t), next) });
}
function WakeLabel({ snoozedUntil, t }) {
    return _jsx(_Fragment, { children: useTickingLabel(now => formatRelative(snoozeWakeIn(snoozedUntil, now), t), nextMinute) });
}
/** T3's top status, in its precedence order, for the statuses a Harness Session reports. */
function topStatusOf(row, iconClass, t) {
    const status = (label, icon, tone, woke = false) => ({ label, icon, tone: tone ?? '', woke });
    if (row.status === 'working')
        return status(t('status.working'), _jsx(CircleDashedIcon, { className: iconClass }), css.toneInfo);
    if (row.status === 'waiting')
        return status(t('status.waiting'), _jsx(CircleDotDashedIcon, { className: iconClass }), css.toneMuted);
    if (row.status === 'approval')
        return status(t('status.approval'), _jsx(ShieldQuestionIcon, { className: iconClass }), css.toneWarning);
    if (row.status === 'input')
        return status(t('status.input'), _jsx(MessageCircleQuestionIcon, { className: iconClass }), css.toneIndigo);
    if (row.isWoke)
        return status(t('status.woke'), _jsx(AlarmClockIcon, { className: iconClass }), css.toneWarning, true);
    if (row.unread)
        return status(t('status.done'), _jsx(CircleCheckIcon, { className: iconClass }), css.toneSuccess);
    return null;
}
/** T3 `ThreadRenameInput`: Enter commits, Escape cancels, blur commits once. */
function RenameInput({ title, label, onCommit, onCancel }) {
    const [value, setValue] = useState(title);
    const settled = useRef(false);
    return (_jsx("input", { 
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the rename field takes focus when it opens, as in T3
        autoFocus: true, value: value, dir: "auto", "aria-label": label, className: css.renameInput, onChange: (event) => { setValue(event.target.value); }, onFocus: (event) => { event.currentTarget.select(); }, onClick: (event) => { event.stopPropagation(); }, onDoubleClick: (event) => { event.stopPropagation(); }, onKeyDown: (event) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing)
                return;
            if (event.key === 'Enter') {
                event.preventDefault();
                settled.current = true;
                onCommit(value);
            }
            else if (event.key === 'Escape') {
                event.preventDefault();
                settled.current = true;
                onCancel();
            }
        }, onBlur: () => { if (!settled.current)
            onCommit(value); } }));
}
/** T3 `SnoozeMenuButton`: presets resolve when the menu opens, so each opening reads a fresh time. */
function SnoozeMenuButton({ open, onOpenChange, onSnooze, onCustom, t }) {
    const [presets, setPresets] = useState(() => resolveSnoozePresets(new Date()));
    const items = [
        ...presets.map(preset => ({
            id: preset.id,
            label: (_jsxs("span", { className: css.menuPreset, children: [_jsx("span", { children: presetLabel(preset, t) }), _jsx("span", { className: css.menuDetail, children: presetWhen(preset, t) })] })),
        })),
        ...presets.length > 0 ? [{ type: 'separator', id: 'sep' }] : [],
        { id: 'custom', label: t('snooze.custom') },
    ];
    return (_jsx(Menu, { open: open, portal: true, align: "end", items: items, onClose: () => { onOpenChange(false); }, onSelect: (id) => {
            onOpenChange(false);
            if (id === 'custom') {
                onCustom();
                return;
            }
            const picked = pickSnoozePreset(presets, id, new Date());
            if (picked !== null)
                onSnooze(picked.snoozedUntil);
        }, anchor: (_jsx(Tooltip, { label: t('action.snooze'), side: "top", delayMs: 150, portal: true, children: _jsx("button", { type: "button", "aria-label": t('action.snooze'), className: css.snoozeButton, onClick: (event) => {
                    event.stopPropagation();
                    if (!open)
                        setPresets(resolveSnoozePresets(new Date()));
                    onOpenChange(!open);
                }, onDoubleClick: (event) => { event.stopPropagation(); }, children: _jsx(ClockIcon, { className: css.size3 }) }) })) }));
}
/** T3 `ProviderInstanceIcon` in its compact sidebar size: the provider's or native agent's mark, dimmed. */
function ProviderIcon({ model, className }) {
    if (model === null)
        return null;
    return hasProviderMark(model.provider, model.model)
        ? _jsx(ProviderMark, { provider: model.provider, model: model.model, size: 14, className: className })
        : _jsx(SparkleIcon, { className: className, width: 14, height: 14 });
}
/** T3 `SidebarThreadTooltip` inside `ThreadHoverCard`. */
function ThreadDetails({ row }) {
    return (_jsxs("div", { className: css.hoverCard, children: [_jsx("div", { className: css.hoverTitle, children: row.title }), _jsxs("div", { className: css.hoverGrid, children: [row.projectName !== null && (_jsxs("div", { className: css.hoverLine, children: [_jsx(FolderIcon, { className: css.size3 }), _jsx("div", { className: css.hoverValue, children: row.projectName })] })), row.branch !== null && (_jsxs("div", { className: css.hoverLine, children: [_jsx(GitBranchIcon, { className: css.size3 }), _jsx("div", { className: css.hoverValue, children: row.branch })] })), row.model !== null && (_jsxs("div", { className: css.hoverLine, children: [_jsx(ProviderIcon, { model: row.model, className: css.hoverProvider }), _jsx("div", { className: css.hoverValue, children: row.model.model })] }))] })] }));
}
/**
 * Render one thread row.
 * @param props - row data, variant, selection, and commands.
 * @returns the list item.
 */
export const ThreadRow = memo(function ThreadRow(props) {
    const { row, variant, isActive, actions, t } = props;
    const [snoozeOpen, setSnoozeOpen] = useState(false);
    const recede = shouldRecede({ status: row.status, isUnread: row.unread, isWoke: row.isWoke, isActive });
    const action = row.section === 'snoozed' ? 'unsnooze' : row.section === 'settled' ? 'unsettle' : 'settle';
    const showSnooze = canSnooze(row) && action === 'settle';
    if (snoozeOpen && !showSnooze)
        setSnoozeOpen(false);
    const stop = (handler) => (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler();
    };
    const onKeyDown = (event) => {
        if (event.target !== event.currentTarget)
            return;
        if (event.key === 'F2' && !props.isRenaming) {
            event.preventDefault();
            props.onStartRename(row);
            return;
        }
        if (event.key !== 'Enter' && event.key !== ' ')
            return;
        event.preventDefault();
        actions.open(row.id);
    };
    const surface = cx(css.rowSurface, action === 'unsettle' && !isActive && css.settledMuted, isActive ? css.rowActive : recede ? css.rowRecede : css.rowIdle, recede && row.status === 'working' && css.rowWorkingRecede);
    const titleClass = variant === 'card'
        ? cx(css.title, recede ? css.titleRecede : css.titleStrong)
        : cx(css.title, css.titleSlim, recede ? css.slimRecede
            : isActive || row.isWoke || row.status === 'input' ? css.slimStrong : row.unread ? css.slimUnread : css.slimQuiet, !recede && css.weightMedium);
    const title = props.isRenaming
        ? (_jsx(RenameInput, { title: row.title, label: t('rename.aria'), onCommit: (next) => {
                props.onCancelRename();
                const trimmed = next.trim();
                if (trimmed !== '' && trimmed !== row.title)
                    actions.rename(row.id, trimmed);
            }, onCancel: props.onCancelRename }))
        : _jsx("span", { "aria-hidden": true, className: titleClass, dir: "auto", children: row.title });
    const pin = row.pinned && variant === 'card'
        ? (_jsx(Tooltip, { label: t('action.unpin'), side: "bottom", delayMs: 150, portal: true, children: _jsxs("button", { type: "button", "aria-label": t('action.unpin'), className: css.unpin, onClick: stop(() => { actions.unpin(row.id); }), children: [_jsx(PinIcon, { className: cx(css.size3, css.pinOn) }), _jsx(PinOffIcon, { className: cx(css.size3, css.pinOff) })] }) }))
        : null;
    const common = {
        role: 'button',
        tabIndex: 0,
        'data-sidebar-row': row.id,
        'aria-label': row.title,
        'aria-current': isActive ? 'page' : undefined,
        onClick: () => { actions.open(row.id); },
        onDoubleClick: (event) => {
            if (event.target.closest('button, a, input') !== null || props.isRenaming)
                return;
            event.preventDefault();
            props.onStartRename(row);
        },
        onKeyDown,
        onContextMenu: (event) => {
            event.preventDefault();
            props.onContextMenu(row, { x: event.clientX, y: event.clientY });
        },
    };
    const details = _jsx(ThreadDetails, { row: row });
    if (variant === 'slim') {
        return (_jsx("li", { className: cx(css.slimItem, props.option?.selected === true && css.searchActive), "data-thread-item": row.id, "data-section": row.section, ...props.option === undefined ? {} : {
                id: props.option.id, role: 'option', 'aria-selected': props.option.selected, onMouseEnter: props.option.onHighlight,
            }, children: _jsx(HoverCard, { grouped: true, openDelayMs: 150, disabled: props.isRenaming, content: details, anchor: (_jsxs("div", { ...common, "data-testid": "sidebar-row-slim", className: cx(surface, css.slimRow), children: [_jsx("span", { className: cx(css.slimIcon, (!isActive || action === 'unsettle') && css.slimIconDim), children: _jsx(FolderIcon, { className: css.size4 }) }), title, _jsxs("span", { className: css.slimTrailing, children: [_jsx("span", { className: cx(css.slimLabel, !row.isWoke && css.hideOnRowHover), children: action === 'unsnooze' && row.record?.snoozedUntil != null
                                        ? (_jsxs("span", { className: cx(css.wakeLabel, css.toneInfo), children: [_jsx(AlarmClockIcon, { className: css.size3 }), _jsx(WakeLabel, { snoozedUntil: row.record.snoozedUntil, t: t })] }))
                                        : row.isWoke
                                            ? (_jsxs("button", { type: "button", "aria-label": t('action.dismissWoke'), className: cx(css.wokeButton, css.toneWarning), onClick: stop(() => { actions.acknowledgeWoke(row.id); }), children: [_jsx(AlarmClockIcon, { className: css.size3 }), _jsx("span", { role: "status", children: t('status.woke') })] }))
                                            : (_jsx("span", { className: css.textXs, children: _jsx(RelativeTimeLabel, { t: t, at: action === 'unsettle' && row.record?.settledAt != null ? Date.parse(row.record.settledAt) : row.activityAt }) })) }), action === 'unsnooze'
                                    ? (_jsx(Tooltip, { label: t('action.wake'), side: "top", delayMs: 150, portal: true, children: _jsx("button", { type: "button", "aria-label": t('action.wake'), className: cx(css.slimAction, row.isWoke && css.slimActionStatic), onClick: stop(() => { actions.unsnooze(row.id); }), children: _jsx(AlarmClockOffIcon, { className: css.size3 }) }) }))
                                    : action === 'unsettle'
                                        ? (_jsx(Tooltip, { label: t('action.unsettle'), side: "top", delayMs: 150, portal: true, children: _jsx("button", { type: "button", "aria-label": t('action.unsettle'), className: cx(css.slimAction, row.isWoke && css.slimActionStatic), onClick: stop(() => { actions.unsettle(row.id); }), children: _jsx(Undo2Icon, { className: css.size35 }) }) }))
                                        : (_jsx(Tooltip, { label: t('action.settle'), side: "top", delayMs: 150, portal: true, children: _jsx("button", { type: "button", "aria-label": t('action.settle'), className: cx(css.slimAction, css.slimSettle, row.isWoke && css.slimActionStatic), onClick: stop(() => { actions.settle(row.id); }), children: _jsx(CheckIcon, { className: css.size3 }) }) }))] })] })) }) }));
    }
    const status = topStatusOf(row, css.size4, t);
    // T3 metaLine: the branch line; when it is empty the trailing icons move up to the title line.
    const providerIcons = row.model === null
        ? null
        : _jsx("span", { "aria-hidden": true, className: css.metaIcons, children: _jsx(ProviderIcon, { model: row.model, className: css.providerIcon }) });
    const metaLine = row.branch === null
        ? null
        : (_jsxs("div", { className: css.metaLine, children: [_jsx("span", { className: css.branch, title: row.branch, children: row.branch }), providerIcons] }));
    const isWokeStatus = status?.woke === true;
    return (_jsx("li", { className: css.cardItem, "data-thread-item": row.id, "data-section": row.section, children: _jsx(HoverCard, { grouped: true, openDelayMs: 150, disabled: snoozeOpen || props.isRenaming, content: details, anchor: (_jsx("div", { ...common, "data-testid": "sidebar-row-card", className: surface, children: _jsxs("div", { className: cx(css.cardContent, metaLine !== null && css.cardContentTall), children: [_jsxs("div", { className: css.cardTop, children: [_jsx(FolderIcon, { className: cx(css.size4, css.projectIcon) }), pin, row.projectName !== null
                                    ? _jsx("span", { className: css.projectName, children: row.projectName })
                                    : _jsx("span", { className: css.flex1 }), _jsxs("span", { className: css.statusSlot, children: [_jsx("span", { className: cx(css.statusLabel, !isWokeStatus && css.hideOnRowHover, snoozeOpen && css.statusHidden), children: status === null
                                                ? _jsx(RelativeTimeLabel, { t: t, at: row.activityAt })
                                                : isWokeStatus
                                                    ? (_jsxs("button", { type: "button", "aria-label": t('action.dismissWoke'), className: cx(css.wokeButton, status.tone), onClick: stop(() => { actions.acknowledgeWoke(row.id); }), children: [_jsx(AlarmClockIcon, { className: css.size4 }), _jsx("span", { role: "status", children: status.label })] }))
                                                    : (_jsxs("span", { className: cx(css.statusPill, status.tone), children: [status.icon, status.label, row.status === 'working' && row.runningSince !== null
                                                                ? _jsx("span", { "aria-hidden": true, children: _jsx(WorkingDuration, { startedMs: row.runningSince, t: t }) })
                                                                : null] })) }), _jsxs("span", { className: cx(css.rowControls, snoozeOpen && css.rowControlsOpen), children: [showSnooze && (_jsx(SnoozeMenuButton, { t: t, open: snoozeOpen, onOpenChange: setSnoozeOpen, onSnooze: (snoozedUntil) => { actions.snooze(row.id, snoozedUntil); }, onCustom: () => { actions.requestCustomSnooze(row.id); } })), _jsx(Tooltip, { label: t('action.settle'), side: "top", delayMs: 150, portal: true, children: _jsxs("button", { type: "button", "aria-label": t('action.settle'), className: css.settleButton, onClick: stop(() => { actions.settle(row.id); }), onDoubleClick: (event) => { event.stopPropagation(); }, children: [_jsx(CheckIcon, { className: css.size35 }), t('action.settleShort')] }) })] })] })] }), _jsxs("div", { className: css.cardTitleLine, children: [title, metaLine === null ? providerIcons : null] }), metaLine] }) })) }) }));
});
//# sourceMappingURL=ThreadRow.js.map