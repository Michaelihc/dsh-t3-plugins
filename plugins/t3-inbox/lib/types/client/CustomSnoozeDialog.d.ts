import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { CustomSnoozeRequest } from './actions.ts';
/** Dialog share: the pending request, its dismissal, and the snooze command. */
export type CustomSnoozeInjected = {
    hooks: {
        request: HostObservable<CustomSnoozeRequest | null>;
    };
    dismiss: () => void;
    snooze: (sessionId: string, snoozedUntil: string) => void;
};
type Props = PropsRuntime<'shell.overlay'> & InjectFace<CustomSnoozeInjected> & PropsLocale<'t3Inbox'>;
/**
 * Render the dialog while a request is pending; keyed by Session so a new request starts fresh.
 * @param props - overlay share and the injected request.
 * @returns the dialog or null.
 */
export declare function CustomSnoozeDialog({ t, useRequest, dismiss, snooze }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=CustomSnoozeDialog.d.ts.map