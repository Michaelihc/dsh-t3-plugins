import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Custom snooze dialog: a local date and time, or a duration.
 *
 * Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
 * `apps/web/src/components/CustomSnoozeDialog.tsx`. Base UI Dialog, ToggleGroup,
 * Calendar, NumberField, and Select become the dsh Modal, SegmentedControl, and native
 * date, time, number, and select inputs; see PORTING.md.
 *
 * MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
 */
import { useId, useState } from 'react';
import { Button, Modal, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives';
import { localSnoozeDate, localSnoozeTime, resolveCustomSnooze } from "../logic.js";
import css from './CustomSnoozeDialog.module.css';
function Form({ request, dismiss, snooze, t }) {
    const id = useId();
    const [initial] = useState(() => new Date(Date.now() + 3_600_000));
    const [mode, setMode] = useState('date');
    const [date, setDate] = useState(localSnoozeDate(initial));
    const [time, setTime] = useState(localSnoozeTime(initial));
    const [amount, setAmount] = useState('2');
    const [unit, setUnit] = useState('hours');
    const [error, setError] = useState(null);
    const submit = (event) => {
        event.preventDefault();
        const input = mode === 'date' ? { mode, date, time } : { mode, amount, unit };
        const snoozedUntil = resolveCustomSnooze(input, new Date());
        if (snoozedUntil === null) {
            setError(mode === 'date' ? t('custom.errorDate') : t('custom.errorDuration'));
            return;
        }
        snooze(request.sessionId, snoozedUntil);
        dismiss();
    };
    return (_jsx(Modal, { open: true, onClose: dismiss, title: t('custom.title'), closeLabel: t('custom.close'), description: t('custom.description'), className: css.dialog ?? '', footer: (_jsxs("div", { className: css.footer, children: [_jsx(Button, { variant: "outline", size: "sm", onClick: dismiss, children: t('custom.cancel') }), _jsx(Button, { variant: "primary", size: "sm", type: "submit", form: `${id}-form`, children: t('custom.submit') })] })), children: _jsxs("form", { id: `${id}-form`, className: css.form, onSubmit: submit, "data-testid": "t3-inbox-custom-snooze", children: [_jsx(SegmentedControl, { id: `${id}-mode`, label: t('custom.scheduleType'), value: mode, options: [{ value: 'date', label: t('custom.modeDate') }, { value: 'duration', label: t('custom.modeDuration') }], onChange: (next) => { setMode(next); setError(null); } }), mode === 'date'
                    ? (_jsxs("div", { className: css.fields, id: `${id}-mode-date-panel`, role: "tabpanel", "aria-labelledby": `${id}-mode-date`, children: [_jsxs("label", { className: css.field, children: [t('custom.date'), _jsx("input", { className: css.input, type: "date", required: true, value: date, min: localSnoozeDate(new Date()), "data-modal-autofocus": true, onChange: (event) => { setDate(event.target.value); setError(null); } })] }), _jsxs("label", { className: css.field, children: [t('custom.time'), _jsx("input", { className: css.input, type: "time", required: true, value: time, onChange: (event) => { setTime(event.target.value); setError(null); } })] })] }))
                    : (_jsxs("div", { className: css.fields, id: `${id}-mode-duration-panel`, role: "tabpanel", "aria-labelledby": `${id}-mode-duration`, children: [_jsxs("label", { className: css.field, children: [t('custom.amount'), _jsx("input", { className: css.input, type: "number", min: "0", step: "any", required: true, value: amount, "data-modal-autofocus": true, onChange: (event) => { setAmount(event.target.value); setError(null); } })] }), _jsxs("label", { className: css.field, children: [t('custom.unit'), _jsxs("select", { className: css.input, value: unit, onChange: (event) => { setUnit(event.target.value); setError(null); }, children: [_jsx("option", { value: "minutes", children: t('custom.unit.minutes') }), _jsx("option", { value: "hours", children: t('custom.unit.hours') }), _jsx("option", { value: "days", children: t('custom.unit.days') })] })] })] })), error !== null && _jsx("p", { className: css.error, role: "alert", children: error })] }) }));
}
/**
 * Render the dialog while a request is pending; keyed by Session so a new request starts fresh.
 * @param props - overlay share and the injected request.
 * @returns the dialog or null.
 */
export function CustomSnoozeDialog({ t, useRequest, dismiss, snooze }) {
    const request = useRequest(value => value);
    if (request === null)
        return null;
    return _jsx(Form, { request: request, dismiss: dismiss, snooze: snooze, t: t }, request.sessionId);
}
//# sourceMappingURL=CustomSnoozeDialog.js.map