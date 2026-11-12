import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * T3 Code's related-threads list for one thread (https://github.com/pingdotgg/t3code,
 * commit 4c8eb1dfd5, `apps/web/src/components/chat/ThreadRelationshipsControl.tsx`): the
 * "Parent thread" row with `CornerLeftUpIcon` and one `BotIcon` row per subagent with its
 * status. Subagent threads have no sidebar row, so this is how they are reached. dsh has no
 * thread details panel, so the list opens from the Session header's actions band.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc.
 */
import { useState } from 'react';
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { BotIcon, CircleCheckIcon, CircleDashedIcon, CircleDotDashedIcon, CornerLeftUpIcon, MessageCircleQuestionIcon, ShieldQuestionIcon } from "./icons.js";
import css from './Sidebar.module.css';
/** T3 `threadRelationshipStatusLabel`, for the states a Session reports. */
const STATUS_KEY = {
    working: 'status.working', waiting: 'status.waiting', approval: 'status.approval', input: 'status.input', ready: 'status.completed',
};
function statusIcon(status) {
    const cls = `${css.size3} ${css.shrink0}`;
    switch (status) {
        case 'working': return _jsx(CircleDashedIcon, { className: `${cls} ${css.toneInfo}` });
        case 'waiting': return _jsx(CircleDotDashedIcon, { className: `${cls} ${css.toneMuted}` });
        case 'approval': return _jsx(ShieldQuestionIcon, { className: `${cls} ${css.toneWarning}` });
        case 'input': return _jsx(MessageCircleQuestionIcon, { className: `${cls} ${css.toneIndigo}` });
        default: return _jsx(CircleCheckIcon, { className: `${cls} ${css.toneSuccess}` });
    }
}
export function RelatedThreads({ t, useRelations, open }) {
    const relations = useRelations(value => value);
    const [menuOpen, setMenuOpen] = useState(false);
    if (relations.parent === null && relations.children.length === 0)
        return null;
    const items = [];
    if (relations.parent !== null) {
        items.push({ type: 'label', id: 'parent-label', text: t('related.parent') });
        items.push({
            id: relations.parent.id,
            label: relations.parent.title,
            icon: _jsx(CornerLeftUpIcon, { className: css.size4 }),
        });
    }
    if (relations.children.length > 0) {
        items.push({ type: 'label', id: 'subagents-label', text: t('related.subagents') });
        for (const child of relations.children) {
            items.push({
                id: child.id,
                label: (_jsxs("span", { className: css.relatedRow, "aria-label": t('related.itemAria', { title: child.title, status: t(STATUS_KEY[child.status]) }), children: [_jsx("span", { className: css.relatedTitle, children: child.title }), statusIcon(child.status)] })),
                icon: _jsx(BotIcon, { className: css.size4 }),
            });
        }
    }
    const working = relations.children.filter(child => child.status === 'working').length;
    return (_jsx(Menu, { open: menuOpen, portal: true, align: "start", items: items, onClose: () => { setMenuOpen(false); }, onSelect: (id) => {
            setMenuOpen(false);
            open(id);
        }, anchor: (_jsx("button", { type: "button", className: css.relatedTrigger, "aria-label": t('related.trigger'), "aria-expanded": menuOpen, onClick: () => { setMenuOpen(value => !value); }, children: relations.parent !== null
                ? _jsxs(_Fragment, { children: [_jsx(CornerLeftUpIcon, { className: css.size3 }), _jsx("span", { className: css.relatedTitle, children: relations.parent.title })] })
                : _jsxs(_Fragment, { children: [_jsx(BotIcon, { className: css.size3 }), _jsx("span", { children: relations.children.length }), working > 0 && _jsx(CircleDashedIcon, { className: `${css.size3} ${css.toneInfo}` })] }) })) }));
}
//# sourceMappingURL=RelatedThreads.js.map