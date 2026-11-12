declare module '@deepseek-ai/dsh-typert-protocol' {
    interface RemoteErrorDetailsMap {
        /** The wake time is not a future ISO instant. */
        'inbox/invalid-snooze': {
            readonly snoozedUntil: string;
        };
        /** The Session is waiting for an approval, so it cannot be snoozed. */
        'inbox/needs-attention': {
            readonly sessionId: string;
        };
    }
}
/** Per-Session inbox overlay; absent fields mean "not settled" and "not snoozed". */
export interface InboxRecord {
    /** ISO instant the Session was settled, or null while active. */
    readonly settledAt: string | null;
    /** Who settled it. */
    readonly settleReason: 'manual' | 'auto' | null;
    /** ISO instant the user unsettled it by hand (T3 `settledOverride: "active"`); the sweep then leaves it alone. */
    readonly unsettledAt?: string | null;
    /** ISO wake time, or null when not snoozed. */
    readonly snoozedUntil: string | null;
    /** ISO instant the snooze was set; activity after it wakes the Session early. */
    readonly snoozedAt: string | null;
    /** Set from the row menu's "Auto-settle behavior: Disabled". */
    readonly autoSettleDisabled?: boolean;
}
/**
 * What the T3 orchestrator plugin, when mounted, reports about a Session that is one of
 * its threads (its `t3Threads` Host service).
 */
export interface InboxThreadFact {
    /** False for subagent threads, which T3 lists only inside their parent. */
    readonly listed: boolean;
    /** The parent thread's Session id. */
    readonly parentSessionId: string | null;
    /** The running turn only waits on another thread. */
    readonly blockedOnThreadWait: boolean;
    /** Settled, but delegated work it waits on is still running. */
    readonly backgroundWork: boolean;
}
/** Complete inbox state as the browser reads it. */
export interface InboxSnapshot {
    /** Overlays keyed by Session id; Sessions without a record are active. */
    readonly records: Readonly<Record<string, InboxRecord>>;
    /** Idle days before the Host sweep settles a Session; null when auto-settle is off. */
    readonly autoSettleAfterDays: number | null;
    /** Monotonic change counter for this Host process. */
    readonly revision: number;
    /** Orchestrator threads by Session id; empty without the orchestrator plugin. */
    readonly threads: Readonly<Record<string, InboxThreadFact>>;
}
//# sourceMappingURL=types.d.ts.map