import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { hasProviderMark, NATIVE_AGENT_PROVIDER, ProviderMark } from "./agentMarks.js";
import { BotIcon, ChevronRightIcon, CircleCheckIcon, CircleDashedIcon, CircleDotDashedIcon, CircleXIcon, MessageCircleQuestionIcon, ShieldQuestionIcon, } from "./icons.js";
import { WorkingDuration } from "./ThreadRow.js";
import css from './Sidebar.module.css';
/** Wire name of the orchestrator's delegation tool as the parent Session calls it. */
export const DELEGATE_TOOL = 'mcp__dsh-orchestrator__delegate_task';
const STATUS_KEY = {
    working: 'status.working', waiting: 'status.waiting', approval: 'status.approval', input: 'status.input', ready: 'status.done', failed: 'delegation.failed',
};
/**
 * The child thread and terminal state a settled `delegate_task` result reports.
 * @param text - the result's text content.
 * @returns the child thread id and whether the call failed, or null for an unreadable result.
 */
export function delegationResult(text) {
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return null;
    } // not a delegation receipt; the card shows the call alone
    if (typeof value !== 'object' || value === null)
        return null;
    const record = value;
    return {
        childThreadId: typeof record.childThreadId === 'string' ? record.childThreadId : null,
        failed: record.status === 'failed' || record.status === 'error',
    };
}
function statusIcon(status) {
    const cls = `${css.size3} ${css.shrink0}`;
    switch (status) {
        case 'working': return _jsx(CircleDashedIcon, { className: `${cls} ${css.toneInfo} ${css.delegationSpin}` });
        case 'waiting': return _jsx(CircleDotDashedIcon, { className: `${cls} ${css.toneMuted}` });
        case 'approval': return _jsx(ShieldQuestionIcon, { className: `${cls} ${css.toneWarning}` });
        case 'input': return _jsx(MessageCircleQuestionIcon, { className: `${cls} ${css.toneIndigo}` });
        case 'failed': return _jsx(CircleXIcon, { className: `${cls} ${css.toneWarning}` });
        default: return _jsx(CircleCheckIcon, { className: `${cls} ${css.toneSuccess}` });
    }
}
/**
 * One delegated task in its parent's transcript.
 * @param props - the tool call, the parent's related threads, and the opener.
 * @returns the card.
 */
export function DelegationCard(props) {
    const { t, useRelations, open, block } = props;
    const title = block.args.text('title') ?? t('delegation.untitled');
    const target = block.args.value('target');
    const agent = typeof target === 'object' && target !== null && !Array.isArray(target) && typeof target.providerInstanceId === 'string'
        ? target.providerInstanceId
        : null;
    const result = props.phase === 'result' ? props.block : null;
    const settled = result === null ? null : delegationResult(result.content.map(part => part.type === 'text' ? part.text : '').join(''));
    // A waiting call has no receipt yet; until it settles, the child is the parent's subagent with this task's title.
    const receiptId = settled?.childThreadId ?? null;
    const child = useRelations(relations => receiptId !== null
        ? relations.children.find(item => item.id === receiptId) ?? null
        : result === null ? relations.children.findLast(item => item.title === title) ?? null : null);
    const childId = receiptId ?? child?.id ?? null;
    const status = result !== null && (result.isError || settled?.failed === true)
        ? 'failed'
        : child?.status ?? (result !== null ? 'ready' : 'working');
    const provider = child?.model?.provider ?? (agent === null ? null : NATIVE_AGENT_PROVIDER);
    const model = child?.model?.model ?? agent;
    const mark = provider !== null && model !== null && hasProviderMark(provider, model)
        ? _jsx(ProviderMark, { provider: provider, model: model, size: 16 })
        : _jsx(BotIcon, { className: css.size4 });
    const body = (_jsxs(_Fragment, { children: [_jsx("span", { className: css.delegationMark, "aria-hidden": true, children: mark }), _jsxs("span", { className: css.delegationBody, children: [_jsx("span", { className: css.delegationTitle, children: title }), _jsxs("span", { className: css.delegationStatus, children: [statusIcon(status), _jsx("span", { children: t(STATUS_KEY[status]) })] })] }), _jsxs("span", { className: css.delegationMeta, children: [status === 'working' && child?.runningSince != null ? _jsx(WorkingDuration, { startedMs: child.runningSince, t: t }) : null, childId !== null ? _jsx(ChevronRightIcon, { className: css.size4 }) : null] })] }));
    return (_jsx("div", { className: `${css.tokens} ${css.delegationWrap}`, children: childId === null
            ? _jsx("div", { className: css.delegationCard, "data-delegation-status": status, children: body })
            : (_jsx("button", { type: "button", className: css.delegationCard, "data-delegation-status": status, "aria-label": t('delegation.open', { title }), onClick: () => { open(childId); }, children: body })) }));
}
//# sourceMappingURL=DelegationCard.js.map