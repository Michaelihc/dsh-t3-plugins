import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { buildInboxView, resolveStatus } from "./view.js";
const NO_RELATIONS = { parent: null, children: [] };
const PREFS_KEY = 't3-inbox:prefs';
const VISITED_KEY = 't3-inbox:visited';
const COMPLETED_KEY = 't3-inbox:completed';
/** Re-read branches this often while the sidebar runs; a checkout changes them. */
const BRANCH_REFRESH_MS = 60_000;
/** setTimeout's ceiling is about 24.8 days; re-arm daily instead. */
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;
/** Wait before reopening a stream that ended or failed. */
const RETRY_MS = 2_000;
/** Provider and model of a Session's latest (or pending) model selection. */
function modelOf(values) {
    const selection = values?.modelSelection;
    const chosen = (selection?.lastUsed ?? selection?.pending);
    return typeof chosen?.provider === 'string' && typeof chosen.model === 'string' ? { provider: chosen.provider, model: chosen.model } : null;
}
/** Latest prompt or observed run completion; the list's update time only when neither is known. */
function activityOf(values, completedAt, updatedAt) {
    const promptAt = values?.sessionListMetadata?.lastPromptAt;
    const latest = Math.max(typeof promptAt === 'number' ? promptAt : 0, completedAt ?? 0);
    return latest > 0 ? latest : updatedAt;
}
function readJson(key, fallback) {
    try {
        const raw = globalThis.localStorage?.getItem(key);
        return raw == null ? fallback : { ...fallback, ...JSON.parse(raw) };
    }
    catch {
        return fallback;
    }
}
function writeJson(key, value) {
    try {
        globalThis.localStorage?.setItem(key, JSON.stringify(value));
    }
    catch { /* private mode: keep in memory */ }
}
/** Owner of the overlay stream, optimistic edits, visit markers, and the derived view. */
export class InboxModel {
    ctx;
    remote;
    inputs;
    /** Host overlay records with optimistic edits applied. */
    records = createSnapshotStore({});
    /** Persisted per-browser preferences. */
    prefs = createSnapshotStore(readJson(PREFS_KEY, {
        scope: [], workingExpanded: false, snoozedExpanded: false, settledExpanded: false,
    }));
    /** Session shown in the main view, when the Conversation is showing. */
    current;
    /** Projects the scope filter offers. */
    projects;
    /** Derived view; identity changes only when an input or the wake clock changes. */
    view;
    host = {};
    /** Orchestrator thread facts by Session id, from the Host snapshot. */
    threads = {};
    threadsKey = '{}';
    pending = new Map();
    lastCurrent = null;
    seq = 0;
    visited = readJson(VISITED_KEY, {});
    completed = readJson(COMPLETED_KEY, {});
    running = new Map();
    branches = {};
    branchFetch;
    runningSince = new Map();
    questionAt = new Map();
    listeners = new Set();
    tick = 0;
    timer;
    cache;
    projectCache;
    currentCache;
    stream;
    constructor(ctx, remote, inputs) {
        this.ctx = ctx;
        this.remote = remote;
        this.inputs = inputs;
        const subscribe = (listener) => {
            this.listeners.add(listener);
            return () => { this.listeners.delete(listener); };
        };
        this.view = { getSnapshot: () => this.compute(), subscribe };
        this.current = { getSnapshot: () => this.rowOf(this.currentId()), subscribe };
        this.projects = { getSnapshot: () => this.projectList(), subscribe };
        const notify = () => { for (const listener of [...this.listeners])
            listener(); };
        const stops = [
            this.records.subscribe(notify),
            this.prefs.subscribe(() => { writeJson(PREFS_KEY, this.prefs.getSnapshot()); notify(); }),
            inputs.sessions.subscribe(notify),
            inputs.status.subscribe(notify),
            ...inputs.workspaces === undefined ? [] : [inputs.workspaces.subscribe(notify)],
            ...inputs.panel === undefined ? [] : [inputs.panel.subscribe(notify)],
        ];
        ctx.effect(() => () => {
            for (const stop of stops)
                stop();
            clearTimeout(this.timer);
            this.stream?.abort();
            this.listeners.clear();
        }, 't3-inbox: model');
        ctx.on('connection/reset', () => { this.open(); });
        this.open();
        ctx.effect(() => {
            const timer = setInterval(() => { void this.fetchBranches(true); }, BRANCH_REFRESH_MS);
            return () => { clearInterval(timer); };
        }, 't3-inbox: branch refresh');
    }
    /**
     * Read the git branch of every listed working directory not yet known (or all of them).
     * @param all - refresh known directories too.
     */
    async fetchBranches(all) {
        if (this.branchFetch !== undefined)
            return;
        const cwds = [...new Set(Object.values(this.inputs.sessions.getSnapshot().byId)
                .flatMap(summary => summary.cwd === undefined ? [] : [summary.cwd]))]
            .filter(cwd => all || !(cwd in this.branches));
        if (cwds.length === 0)
            return;
        this.branchFetch = (async () => {
            try {
                const result = await this.remote.branches(cwds);
                if (!result.ok)
                    return;
                const next = { ...this.branches, ...result.value };
                for (const cwd of cwds)
                    if (!(cwd in result.value))
                        next[cwd] = null;
                if (cwds.some(cwd => next[cwd] !== this.branches[cwd]) || cwds.some(cwd => !(cwd in this.branches))) {
                    this.branches = next;
                    this.tick += 1;
                    for (const listener of [...this.listeners])
                        listener();
                }
            }
            catch {
                // The branch line is optional; the next refresh retries.
            }
            finally {
                this.branchFetch = undefined;
            }
        })();
    }
    /** (Re)open the Host follow stream; one stream runs at a time. */
    open() {
        this.stream?.abort();
        const controller = new AbortController();
        this.stream = controller;
        void (async () => {
            while (!controller.signal.aborted) {
                try {
                    for await (const snapshot of this.remote.follow(controller.signal)) {
                        if (controller.signal.aborted)
                            return;
                        this.host = snapshot.records;
                        const threadsKey = JSON.stringify(snapshot.threads ?? {});
                        if (threadsKey !== this.threadsKey) {
                            this.threadsKey = threadsKey;
                            this.threads = snapshot.threads ?? {};
                            this.tick += 1;
                        }
                        // A confirmed edit is now part of the Host snapshot.
                        for (const [id, edit] of this.pending)
                            if (edit.confirmed)
                                this.pending.delete(id);
                        this.publish();
                    }
                }
                catch (error) {
                    if (!controller.signal.aborted)
                        this.ctx.logger.warn('t3-inbox: follow stream failed; retrying', error);
                }
                if (controller.signal.aborted)
                    return;
                await new Promise((resolve) => { setTimeout(resolve, RETRY_MS); });
            }
        })();
    }
    publish() {
        const merged = new Map(Object.entries(this.host));
        for (const [id, edit] of this.pending) {
            if (edit.record === null)
                merged.delete(id);
            else
                merged.set(id, edit.record);
        }
        this.records.set(Object.fromEntries(merged));
    }
    /**
     * Apply an edit at once and keep it until the Host confirms or rejects it, so a settled
     * row moves immediately (T3's optimistic drop).
     * @param sessionId - Session the edit targets.
     * @param edit - next overlay, or null to clear it.
     * @param request - the Host write.
     * @returns the Host result.
     */
    async optimistic(sessionId, edit, request) {
        const seq = ++this.seq;
        const entry = { seq, record: edit(this.records.getSnapshot()[sessionId]), confirmed: false };
        this.pending.set(sessionId, entry);
        this.publish();
        const drop = () => {
            if (this.pending.get(sessionId) !== entry)
                return;
            this.pending.delete(sessionId);
            this.publish();
        };
        try {
            const result = await request();
            if (!result.ok)
                drop();
            else {
                // The follow stream may deliver the confirmed record after the call resolves.
                entry.confirmed = true;
                setTimeout(drop, RETRY_MS);
            }
            return result;
        }
        catch (error) {
            drop();
            throw error;
        }
    }
    /**
     * Current overlay of a Session, optimistic edits included.
     * @param sessionId - Session id.
     * @returns the record, or undefined while it has none.
     */
    record(sessionId) {
        return this.records.getSnapshot()[sessionId];
    }
    /**
     * Record that the user saw a Session now (T3 `lastVisitedAt`).
     * @param sessionId - Session shown.
     */
    markVisited(sessionId) {
        this.visited = { ...this.visited, [sessionId]: Date.now() };
        writeJson(VISITED_KEY, this.visited);
        this.tick += 1;
        for (const listener of [...this.listeners])
            listener();
    }
    /**
     * Change persisted preferences.
     * @param patch - fields to replace.
     */
    setPrefs(patch) {
        this.prefs.set({ ...this.prefs.getSnapshot(), ...patch });
    }
    currentId() {
        const list = this.inputs.sessions.getSnapshot();
        const panel = this.inputs.panel?.getSnapshot().activePanelId ?? null;
        const key = [list, panel];
        const cached = this.currentCache;
        if (cached !== undefined && cached.key.every((value, index) => value === key[index]))
            return cached.value;
        const value = panel !== null
            ? null
            : Object.values(list.byId).find(session => (session.retainedBy.mainView ?? 0) > 0)?.id ?? null;
        this.currentCache = { key, value };
        return value;
    }
    /**
     * T3 `resolveSidebarRowThreadId`: an open subagent thread has no row, so its nearest
     * listed ancestor stands in for it. A broken chain resolves to the Session itself.
     */
    rowOf(sessionId) {
        if (sessionId === null)
            return null;
        const seen = new Set();
        let id = sessionId;
        while (this.threads[id]?.listed === false) {
            const parent = this.threads[id]?.parentSessionId ?? null;
            if (parent === null || seen.has(id))
                return sessionId;
            seen.add(id);
            id = parent;
        }
        return id;
    }
    /**
     * Parent and subagents of one Session, from the orchestrator's thread facts.
     * @param sessionId - Session shown.
     * @returns an observable of its relations.
     */
    relationsOf(sessionId) {
        let cache;
        const getSnapshot = () => {
            const list = this.inputs.sessions.getSnapshot();
            const status = this.inputs.status.getSnapshot();
            const key = [this.threadsKey, list, status];
            if (cache !== undefined && cache.key.every((value, index) => value === key[index]))
                return cache.value;
            const related = (id) => {
                const summary = list.byId[id];
                const facts = status.get(id);
                const thread = this.threads[id];
                const pending = facts?.pendingInteraction;
                return {
                    id,
                    title: summary?.title ?? summary?.displayTitle ?? id,
                    status: resolveStatus({
                        running: facts?.running ?? summary?.running ?? false,
                        approval: pending?.kind === 'approval',
                        question: pending !== undefined && pending.kind !== 'approval',
                        questionAt: null,
                        updatedAt: summary?.updatedAt ?? 0,
                        blockedOnThreadWait: thread?.blockedOnThreadWait ?? false,
                        backgroundWork: thread?.backgroundWork ?? false,
                    }),
                };
            };
            const parentId = this.threads[sessionId]?.parentSessionId ?? null;
            const children = Object.entries(this.threads)
                .filter(([id, fact]) => fact.parentSessionId === sessionId && list.byId[id] !== undefined)
                .map(([id]) => related(id));
            const value = parentId === null && children.length === 0
                ? NO_RELATIONS
                : { parent: parentId === null ? null : related(parentId), children };
            cache = { key, value };
            return value;
        };
        return {
            getSnapshot,
            subscribe: (listener) => {
                this.listeners.add(listener);
                return () => { this.listeners.delete(listener); };
            },
        };
    }
    projectList() {
        const items = this.inputs.workspaces?.getSnapshot().items;
        if (this.projectCache !== undefined && this.projectCache.key === items)
            return this.projectCache.value;
        const value = (items ?? []).map(item => ({ id: item.workspaceId, name: item.title }));
        this.projectCache = { key: items, value };
        return value;
    }
    observe(list, status, now) {
        for (const id of list.ids) {
            const facts = status.get(id);
            const running = facts?.running ?? list.byId[id]?.running ?? false;
            if (running && !this.runningSince.has(id))
                this.runningSince.set(id, now);
            if (!running)
                this.runningSince.delete(id);
            // A run this browser saw finish completes now (T3 latestRun.completedAt).
            if (this.running.get(id) === true && !running) {
                this.completed = { ...this.completed, [id]: now };
                writeJson(COMPLETED_KEY, this.completed);
            }
            this.running.set(id, running);
            const question = facts?.pendingInteraction !== undefined && facts.pendingInteraction.kind !== 'approval';
            if (question && !this.questionAt.has(id))
                this.questionAt.set(id, now);
            if (!question)
                this.questionAt.delete(id);
        }
    }
    inputsOf(list, status, workspaces) {
        const archived = new Set(workspaces?.archivedSessionIds ?? []);
        const pinned = new Set(workspaces?.pinnedSessionIds ?? []);
        const projectOf = new Map();
        for (const item of workspaces?.items ?? []) {
            for (const sessionId of item.sessionIds)
                projectOf.set(sessionId, { id: item.workspaceId, name: item.title });
        }
        const scope = new Set(this.prefs.getSnapshot().scope);
        const current = this.currentId();
        const sessions = [];
        for (const id of list.ids) {
            const summary = list.byId[id];
            if (summary === undefined || summary.origin === 'subagent' || archived.has(id))
                continue;
            // T3 `isShownUnderParent`: subagent threads live in their parent's view, not the list.
            const thread = this.threads[id];
            if (thread?.listed === false)
                continue;
            if (summary.blank && id !== current)
                continue;
            const project = projectOf.get(id) ?? null;
            if (scope.size > 0 && (project === null || !scope.has(project.id)))
                continue;
            const facts = status.get(id);
            const pending = facts?.pendingInteraction;
            const running = facts?.running ?? summary.running;
            sessions.push({
                id,
                title: summary.title ?? (summary.blank ? this.ctx.locale.bind('t3Inbox')('thread.new') : summary.displayTitle),
                projectId: project?.id ?? null,
                projectName: project?.name ?? null,
                cwd: summary.cwd ?? null,
                pinned: pinned.has(id),
                running,
                approval: pending?.kind === 'approval',
                question: pending !== undefined && pending.kind !== 'approval',
                questionAt: this.questionAt.get(id) ?? null,
                unread: (facts?.completionUnread ?? false) || this.unseenCompletion(id, current),
                activityAt: activityOf(summary.projectionValues, this.completed[id], summary.updatedAt),
                branch: summary.cwd === undefined ? null : this.branches[summary.cwd] ?? null,
                model: modelOf(summary.projectionValues),
                updatedAt: summary.updatedAt,
                runningSince: running ? this.runningSince.get(id) ?? null : null,
                lastVisitedAt: id === current ? Date.now() : this.visited[id] ?? null,
                blockedOnThreadWait: thread?.blockedOnThreadWait ?? false,
                backgroundWork: thread?.backgroundWork ?? false,
            });
        }
        return sessions;
    }
    /** T3 `hasUnseenCompletion`: a finished run after the last visit, once the Session was ever visited. */
    unseenCompletion(id, current) {
        if (id === current)
            return false;
        const completedAt = this.completed[id];
        const visitedAt = this.visited[id];
        return completedAt !== undefined && visitedAt !== undefined && completedAt > visitedAt;
    }
    compute() {
        const list = this.inputs.sessions.getSnapshot();
        const status = this.inputs.status.getSnapshot();
        const workspaces = this.inputs.workspaces?.getSnapshot();
        const key = [this.records.getSnapshot(), list, status, workspaces, this.prefs.getSnapshot(), this.currentId(), this.tick];
        if (this.cache !== undefined && this.cache.key.every((value, index) => value === key[index]))
            return this.cache.view;
        const now = Date.now();
        this.observe(list, status, now);
        void this.fetchBranches(false);
        const current = this.currentId();
        if (current !== this.lastCurrent) {
            // Leaving or opening a Session both count as seeing it.
            const visited = { ...this.visited };
            if (this.lastCurrent !== null)
                visited[this.lastCurrent] = now;
            if (current !== null)
                visited[current] = now;
            this.visited = visited;
            writeJson(VISITED_KEY, visited);
            this.lastCurrent = current;
        }
        const view = buildInboxView(this.inputsOf(list, status, workspaces), this.records.getSnapshot(), workspaces?.pinnedSessionIds ?? [], now);
        this.cache = { key, view };
        this.arm(view.nextWakeAt);
        return view;
    }
    /** Re-derive once when the earliest snooze wakes; nothing repaints in between. */
    arm(nextWakeAt) {
        clearTimeout(this.timer);
        this.timer = undefined;
        if (nextWakeAt === null || this.ctx.fiber.uid === null)
            return;
        const delay = Math.min(Math.max(nextWakeAt - Date.now() + 50, 0), MAX_TIMER_MS);
        this.timer = setTimeout(() => {
            this.tick += 1;
            for (const listener of [...this.listeners])
                listener();
        }, delay);
    }
}
//# sourceMappingURL=model.js.map