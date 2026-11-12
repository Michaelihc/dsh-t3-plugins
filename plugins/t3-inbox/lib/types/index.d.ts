import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { InboxRecord, InboxSnapshot } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Experimental inbox Remote controller. */
        inboxController: InboxController;
    }
}
/** Pending interactions the gateway holds until a Client answers them. */
interface PendingFacts {
    readonly approvals: ReadonlySet<string>;
    readonly questions: ReadonlySet<string>;
}
/** Host configuration. */
export interface Config {
    /** Idle days before a Session settles automatically; 0 disables auto-settle. */
    autoSettleAfterDays: number;
    /** Sweep period in milliseconds. */
    sweepIntervalMs: number;
}
export default class InboxController extends TypertRemoteService {
    private readonly config;
    static inject: string[];
    static Config: z<Config>;
    private readonly ready;
    private revision;
    private readonly listeners;
    private threads;
    constructor(ctx: Context, config: Config);
    private get afterDays();
    private table;
    private changed;
    private write;
    private current;
    private unsettleOnActivity;
    /**
     * Approvals and questions waiting for an answer. The gateway holds every forwarded
     * waterfall until a Client answers it, so this sees requests no browser has opened yet.
     * @returns Session ids with a pending approval and with a pending question.
     */
    pendingInteractions(): PendingFacts;
    /**
     * Settle Sessions idle beyond the threshold. Running state and last activity come from
     * the Session list; pending approvals and questions come from the gateway.
     * @returns how many Sessions this pass settled.
     */
    sweep(): Promise<number>;
    /**
     * Read every inbox overlay.
     * @returns overlays keyed by Session id, the auto-settle threshold, and the change revision.
     */
    list(): Promise<InboxSnapshot>;
    /**
     * Follow inbox changes made from any client or by the Host sweep.
     * @param signal - Client observation lifetime.
     * @returns the current snapshot, then one snapshot per change.
     */
    follow(signal: AbortSignal): AsyncIterable<InboxSnapshot>;
    /**
     * Move a Session out of the inbox until new activity arrives.
     * @param sessionId - Session to settle.
     */
    settle(sessionId: string): Promise<void>;
    /**
     * Return a settled Session to the inbox; the sweep leaves it alone until the user settles it again.
     * @param sessionId - Session to unsettle.
     */
    unsettle(sessionId: string): Promise<void>;
    /**
     * Hide a Session until a wake time; a new approval or question wakes it early.
     * A Session already waiting on an approval is refused, as in T3 (`canSnooze`).
     * @param sessionId - Session to snooze.
     * @param snoozedUntil - future ISO wake time.
     */
    snooze(sessionId: string, snoozedUntil: string): Promise<void>;
    /**
     * Wake a snoozed Session now.
     * @param sessionId - Session to wake.
     */
    unsnooze(sessionId: string): Promise<void>;
    /**
     * Current git branch of each working directory, for the sidebar's branch line.
     * @param cwds - Session working directories.
     * @returns branch name, short commit for a detached head, or null outside a repository.
     */
    branches(cwds: string[]): Promise<Record<string, string | null>>;
    /**
     * Put back the overlay a Session had before an undone settle or snooze.
     * @param sessionId - Session to restore.
     * @param record - the earlier overlay, or null when it had none.
     */
    restore(sessionId: string, record: InboxRecord | null): Promise<void>;
    /**
     * Turn automatic settling on or off for one Session (T3 "Auto-settle behavior").
     * @param sessionId - Session to configure.
     * @param enabled - whether the sweep may settle it.
     */
    setAutoSettle(sessionId: string, enabled: boolean): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map