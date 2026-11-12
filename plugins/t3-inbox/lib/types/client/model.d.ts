/**
 * Browser inbox model: the Host overlay stream with optimistic edits, the Session
 * facts the Client already knows, per-browser visit markers, and one derived view
 * that the sidebar, the menu, and the undo notice read.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { InboxRecord } from '../types.ts';
import { type InboxView } from './view.ts';
/** Remote face this model drives; the generated `ctx.remote.inbox` namespace satisfies it. */
export type InboxRemote = Context['remote']['inbox'];
/** Sources the view derives from. */
export interface InboxInputs {
    readonly sessions: ObservableSnapshot<SessionListState>;
    readonly status: ObservableSnapshot<SessionStatusSnapshot>;
    readonly workspaces: ObservableSnapshot<WorkspaceSnapshot> | undefined;
    /** Selected main panel; null shows the Conversation. */
    readonly panel: ObservableSnapshot<{
        readonly activePanelId: string | null;
    }> | undefined;
}
/** One project the scope filter offers. */
export interface InboxProject {
    readonly id: string;
    readonly name: string;
}
/** One thread in a Session's related-threads list (T3 `ThreadRelationshipsPanel`). */
export interface InboxRelatedThread {
    readonly id: string;
    readonly title: string;
    readonly status: 'working' | 'waiting' | 'approval' | 'input' | 'ready';
}
/** A Session's orchestrator parent and subagent children. */
export interface InboxRelations {
    readonly parent: InboxRelatedThread | null;
    readonly children: readonly InboxRelatedThread[];
}
/** Per-browser state the sidebar persists (T3 keeps the same keys in localStorage). */
export interface InboxPrefs {
    readonly scope: readonly string[];
    readonly workingExpanded: boolean;
    readonly snoozedExpanded: boolean;
    readonly settledExpanded: boolean;
}
/** Owner of the overlay stream, optimistic edits, visit markers, and the derived view. */
export declare class InboxModel {
    private readonly ctx;
    private readonly remote;
    private readonly inputs;
    /** Host overlay records with optimistic edits applied. */
    readonly records: import("@deepseek-ai/dsh-client-store").SnapshotStore<Readonly<Record<string, InboxRecord>>>;
    /** Persisted per-browser preferences. */
    readonly prefs: import("@deepseek-ai/dsh-client-store").SnapshotStore<InboxPrefs>;
    /** Session shown in the main view, when the Conversation is showing. */
    readonly current: ObservableSnapshot<string | null>;
    /** Projects the scope filter offers. */
    readonly projects: ObservableSnapshot<readonly InboxProject[]>;
    /** Derived view; identity changes only when an input or the wake clock changes. */
    readonly view: ObservableSnapshot<InboxView>;
    private host;
    /** Orchestrator thread facts by Session id, from the Host snapshot. */
    private threads;
    private threadsKey;
    private readonly pending;
    private lastCurrent;
    private seq;
    private visited;
    private completed;
    private readonly running;
    private branches;
    private branchFetch;
    private readonly runningSince;
    private readonly questionAt;
    private readonly listeners;
    private tick;
    private timer;
    private cache;
    private projectCache;
    private currentCache;
    private stream;
    constructor(ctx: Context, remote: InboxRemote, inputs: InboxInputs);
    /**
     * Read the git branch of every listed working directory not yet known (or all of them).
     * @param all - refresh known directories too.
     */
    private fetchBranches;
    /** (Re)open the Host follow stream; one stream runs at a time. */
    private open;
    private publish;
    /**
     * Apply an edit at once and keep it until the Host confirms or rejects it, so a settled
     * row moves immediately (T3's optimistic drop).
     * @param sessionId - Session the edit targets.
     * @param edit - next overlay, or null to clear it.
     * @param request - the Host write.
     * @returns the Host result.
     */
    optimistic<T extends {
        readonly ok: boolean;
    }>(sessionId: string, edit: (record: InboxRecord | undefined) => InboxRecord | null, request: () => Promise<T>): Promise<T>;
    /**
     * Current overlay of a Session, optimistic edits included.
     * @param sessionId - Session id.
     * @returns the record, or undefined while it has none.
     */
    record(sessionId: string): InboxRecord | undefined;
    /**
     * Record that the user saw a Session now (T3 `lastVisitedAt`).
     * @param sessionId - Session shown.
     */
    markVisited(sessionId: string): void;
    /**
     * Change persisted preferences.
     * @param patch - fields to replace.
     */
    setPrefs(patch: Partial<InboxPrefs>): void;
    private currentId;
    /**
     * T3 `resolveSidebarRowThreadId`: an open subagent thread has no row, so its nearest
     * listed ancestor stands in for it. A broken chain resolves to the Session itself.
     */
    private rowOf;
    /**
     * Parent and subagents of one Session, from the orchestrator's thread facts.
     * @param sessionId - Session shown.
     * @returns an observable of its relations.
     */
    relationsOf(sessionId: string): ObservableSnapshot<InboxRelations>;
    private projectList;
    private observe;
    private inputsOf;
    /** T3 `hasUnseenCompletion`: a finished run after the last visit, once the Session was ever visited. */
    private unseenCompletion;
    private compute;
    /** Re-derive once when the earliest snooze wakes; nothing repaints in between. */
    private arm;
}
//# sourceMappingURL=model.d.ts.map