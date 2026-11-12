import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InboxRelations } from '../model.ts';
export type RelatedThreadsInjected = {
    hooks: {
        relations: HostObservable<InboxRelations>;
    };
    open: (sessionId: string) => void;
};
export type RelatedThreadsProps = PropsRuntime<'conversation.session.header.actions'> & InjectFace<RelatedThreadsInjected> & PropsLocale<'t3Inbox'>;
export declare function RelatedThreads({ t, useRelations, open }: RelatedThreadsProps): import("react").JSX.Element | null;
//# sourceMappingURL=RelatedThreads.d.ts.map