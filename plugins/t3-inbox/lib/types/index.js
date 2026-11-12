var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/**
 * Experimental T3-Code-style inbox for Sessions: settle, snooze, wake, and
 * auto-settle, as a Host Remote namespace (`inbox`) plus a durable overlay.
 *
 * The overlay never touches Session logs; it is one storage domain keyed by
 * Session id. New user input on a settled Session unsettles it, and a periodic
 * sweep settles Sessions idle longer than `autoSettleAfterDays`.
 */
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z as zod } from 'zod';
import { shouldAutoSettle } from "./logic.js";
const recordSchema = zod.object({
    settledAt: zod.string().nullable(),
    settleReason: zod.enum(['manual', 'auto']).nullable(),
    unsettledAt: zod.string().nullable().exactOptional(),
    snoozedUntil: zod.string().nullable(),
    snoozedAt: zod.string().nullable(),
    autoSettleDisabled: zod.boolean().exactOptional(),
});
const inboxDomain = defineDomain({
    name: 'inbox',
    version: 1,
    tables: { sessions: domainTable(recordSchema) },
});
const EMPTY = { settledAt: null, settleReason: null, unsettledAt: null, snoozedUntil: null, snoozedAt: null };
/**
 * Read a directory's checked-out branch from `.git/HEAD`, walking up to the repository root.
 * A worktree's `.git` file points at its own git directory.
 * @param cwd - working directory.
 * @returns branch name, a 7-character commit for a detached head, or null outside a repository.
 */
async function readGitBranch(cwd) {
    let dir = resolve(cwd);
    for (let depth = 0; depth < 32; depth++) {
        const dotGit = join(dir, '.git');
        try {
            const info = await stat(dotGit);
            let gitDir = dotGit;
            if (info.isFile()) {
                const pointer = /^gitdir:\s*(.+)$/m.exec(await readFile(dotGit, 'utf8'))?.[1]?.trim();
                if (pointer === undefined)
                    return null;
                gitDir = resolve(dir, pointer);
            }
            const head = (await readFile(join(gitDir, 'HEAD'), 'utf8')).trim();
            const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head)?.[1];
            return ref ?? (/^[0-9a-f]{7,}$/i.test(head) ? head.slice(0, 7) : null);
        }
        catch {
            const parent = dirname(dir);
            if (parent === dir)
                return null;
            dir = parent;
        }
    }
    return null;
}
let InboxController = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _follow_decorators;
    let _settle_decorators;
    let _unsettle_decorators;
    let _snooze_decorators;
    let _unsnooze_decorators;
    let _branches_decorators;
    let _restore_decorators;
    let _setAutoSettle_decorators;
    return class InboxController extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote];
            _follow_decorators = [Remote({ mode: 'stream' })];
            _settle_decorators = [Remote];
            _unsettle_decorators = [Remote];
            _snooze_decorators = [Remote];
            _unsnooze_decorators = [Remote];
            _branches_decorators = [Remote];
            _restore_decorators = [Remote];
            _setAutoSettle_decorators = [Remote];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _follow_decorators, { kind: "method", name: "follow", static: false, private: false, access: { has: obj => "follow" in obj, get: obj => obj.follow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _settle_decorators, { kind: "method", name: "settle", static: false, private: false, access: { has: obj => "settle" in obj, get: obj => obj.settle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _unsettle_decorators, { kind: "method", name: "unsettle", static: false, private: false, access: { has: obj => "unsettle" in obj, get: obj => obj.unsettle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _snooze_decorators, { kind: "method", name: "snooze", static: false, private: false, access: { has: obj => "snooze" in obj, get: obj => obj.snooze }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _unsnooze_decorators, { kind: "method", name: "unsnooze", static: false, private: false, access: { has: obj => "unsnooze" in obj, get: obj => obj.unsnooze }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _branches_decorators, { kind: "method", name: "branches", static: false, private: false, access: { has: obj => "branches" in obj, get: obj => obj.branches }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _restore_decorators, { kind: "method", name: "restore", static: false, private: false, access: { has: obj => "restore" in obj, get: obj => obj.restore }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setAutoSettle_decorators, { kind: "method", name: "setAutoSettle", static: false, private: false, access: { has: obj => "setAutoSettle" in obj, get: obj => obj.setAutoSettle }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        config = __runInitializers(this, _instanceExtraInitializers);
        static inject = ['storageDomain', 'typert'];
        static Config = z.object({
            autoSettleAfterDays: z.natural().default(7),
            sweepIntervalMs: z.natural().min(1000).default(10 * 60 * 1000),
        });
        ready;
        revision = 0;
        listeners = new Set();
        threads;
        constructor(ctx, config) {
            super(ctx, 'inboxController', { namespace: 'inbox' });
            this.config = config;
            this.ready = ctx.storageDomain.open(inboxDomain).then((domain) => {
                ctx.effect(() => () => { void domain.close(); }, 'inbox: close domain');
                return domain.table('sessions');
            });
            // New user input on a settled Session puts it back in the inbox, like new activity on a settled T3 thread.
            ctx.on('session/event', (session, event) => {
                if (event.type !== 'user/message')
                    return;
                void this.unsettleOnActivity(String(session.id));
            }, { global: true });
            ctx.inject(['t3Threads'], (threadsCtx) => {
                const stop = threadsCtx.t3Threads.subscribe(() => { this.changed(); });
                this.threads = threadsCtx.t3Threads;
                this.changed();
                threadsCtx.effect(() => () => {
                    stop();
                    this.threads = undefined;
                    this.changed();
                }, 'inbox: t3Threads');
            });
            ctx.effect(() => {
                const timer = setInterval(() => { void this.sweep(); }, config.sweepIntervalMs);
                const first = setTimeout(() => { void this.sweep(); }, 5_000);
                return () => { clearInterval(timer); clearTimeout(first); };
            }, 'inbox: auto-settle sweep');
        }
        get afterDays() {
            return this.config.autoSettleAfterDays > 0 ? this.config.autoSettleAfterDays : null;
        }
        async table() {
            return await this.ready;
        }
        changed() {
            this.revision += 1;
            for (const listener of this.listeners)
                listener();
        }
        async write(sessionId, next) {
            const table = await this.table();
            const isEmpty = next.settledAt === null && next.snoozedUntil === null
                && (next.unsettledAt ?? null) === null && next.autoSettleDisabled !== true;
            if (isEmpty)
                await table.delete(sessionId);
            else
                await table.put(sessionId, next);
            this.changed();
        }
        async current(sessionId) {
            return (await this.table()).get(sessionId) ?? EMPTY;
        }
        async unsettleOnActivity(sessionId) {
            const record = (await this.table()).get(sessionId);
            if (record === undefined || (record.settledAt === null && record.snoozedUntil === null))
                return;
            // Re-engaging also clears a snooze: the user is looking at it now.
            await this.write(sessionId, { ...record, settledAt: null, settleReason: null, snoozedUntil: null, snoozedAt: null });
        }
        /**
         * Approvals and questions waiting for an answer. The gateway holds every forwarded
         * waterfall until a Client answers it, so this sees requests no browser has opened yet.
         * @returns Session ids with a pending approval and with a pending question.
         */
        pendingInteractions() {
            const approvals = new Set();
            const questions = new Set();
            const gateway = this.ctx.get('typertGateway');
            for (const { event, agentId } of gateway?.getPendingRemoteEvents() ?? []) {
                if (event === 'approval/request')
                    approvals.add(String(agentId));
                else if (event === 'user-questions/request')
                    questions.add(String(agentId));
            }
            return { approvals, questions };
        }
        /**
         * Settle Sessions idle beyond the threshold. Running state and last activity come from
         * the Session list; pending approvals and questions come from the gateway.
         * @returns how many Sessions this pass settled.
         */
        async sweep() {
            const afterDays = this.afterDays;
            const controller = this.ctx.get('sessionController');
            if (afterDays === null || controller === undefined)
                return 0;
            const table = await this.table();
            const { items } = await controller.list({}, AbortSignal.timeout(30_000));
            const pending = this.pendingInteractions();
            const now = Date.now();
            let settled = 0;
            for (const item of items) {
                if (item.origin === 'subagent' || item.blank)
                    continue;
                const record = table.get(item.sessionId);
                const facts = {
                    running: item.running,
                    approval: pending.approvals.has(item.sessionId),
                    question: pending.questions.has(item.sessionId),
                    questionAt: null,
                    updatedAt: item.updatedAt,
                };
                if (!shouldAutoSettle(record, facts, now, afterDays))
                    continue;
                await table.put(item.sessionId, {
                    ...(record ?? EMPTY), settledAt: new Date(now).toISOString(), settleReason: 'auto', snoozedUntil: null, snoozedAt: null,
                });
                settled += 1;
            }
            if (settled > 0)
                this.changed();
            return settled;
        }
        /**
         * Read every inbox overlay.
         * @returns overlays keyed by Session id, the auto-settle threshold, and the change revision.
         */
        async list() {
            const table = await this.table();
            return {
                records: Object.fromEntries(table.entries()),
                autoSettleAfterDays: this.afterDays,
                revision: this.revision,
                threads: this.threads?.facts() ?? {},
            };
        }
        /**
         * Follow inbox changes made from any client or by the Host sweep.
         * @param signal - Client observation lifetime.
         * @returns the current snapshot, then one snapshot per change.
         */
        async *follow(signal) {
            let pending = true;
            let wake;
            const listener = () => { pending = true; wake?.(); };
            this.listeners.add(listener);
            const abort = () => { wake?.(); };
            signal.addEventListener('abort', abort, { once: true });
            try {
                while (!signal.aborted) {
                    if (pending) {
                        pending = false;
                        yield await this.list();
                        continue;
                    }
                    await new Promise((resolve) => { wake = resolve; });
                    wake = undefined;
                }
            }
            finally {
                this.listeners.delete(listener);
                signal.removeEventListener('abort', abort);
            }
        }
        /**
         * Move a Session out of the inbox until new activity arrives.
         * @param sessionId - Session to settle.
         */
        async settle(sessionId) {
            const record = await this.current(sessionId);
            await this.write(sessionId, {
                ...record, settledAt: new Date().toISOString(), settleReason: 'manual', unsettledAt: null, snoozedUntil: null, snoozedAt: null,
            });
        }
        /**
         * Return a settled Session to the inbox; the sweep leaves it alone until the user settles it again.
         * @param sessionId - Session to unsettle.
         */
        async unsettle(sessionId) {
            const record = await this.current(sessionId);
            await this.write(sessionId, { ...record, settledAt: null, settleReason: null, unsettledAt: new Date().toISOString() });
        }
        /**
         * Hide a Session until a wake time; a new approval or question wakes it early.
         * A Session already waiting on an approval is refused, as in T3 (`canSnooze`).
         * @param sessionId - Session to snooze.
         * @param snoozedUntil - future ISO wake time.
         */
        async snooze(sessionId, snoozedUntil) {
            const wake = Date.parse(snoozedUntil);
            if (Number.isNaN(wake) || wake <= Date.now()) {
                throw new RemoteError('inbox/invalid-snooze', `wake time ${snoozedUntil} is not in the future`, { snoozedUntil });
            }
            if (this.pendingInteractions().approvals.has(sessionId)) {
                throw new RemoteError('inbox/needs-attention', `Session ${sessionId} is waiting for an approval`, { sessionId });
            }
            const record = await this.current(sessionId);
            await this.write(sessionId, {
                ...record, settledAt: null, settleReason: null, snoozedUntil: new Date(wake).toISOString(), snoozedAt: new Date().toISOString(),
            });
        }
        /**
         * Wake a snoozed Session now.
         * @param sessionId - Session to wake.
         */
        async unsnooze(sessionId) {
            const record = await this.current(sessionId);
            await this.write(sessionId, { ...record, snoozedUntil: null, snoozedAt: null });
        }
        /**
         * Current git branch of each working directory, for the sidebar's branch line.
         * @param cwds - Session working directories.
         * @returns branch name, short commit for a detached head, or null outside a repository.
         */
        async branches(cwds) {
            // Only directories that listed Sessions work in; a caller cannot probe arbitrary paths.
            const controller = this.ctx.get('sessionController');
            if (controller === undefined)
                return {};
            const { items } = await controller.list({}, AbortSignal.timeout(30_000));
            const known = new Set(items.flatMap(item => item.cwd === undefined ? [] : [item.cwd]));
            const entries = await Promise.all(cwds.filter(cwd => known.has(cwd)).slice(0, 500)
                .map(async (cwd) => [cwd, await readGitBranch(cwd)]));
            return Object.fromEntries(entries);
        }
        /**
         * Put back the overlay a Session had before an undone settle or snooze.
         * @param sessionId - Session to restore.
         * @param record - the earlier overlay, or null when it had none.
         */
        async restore(sessionId, record) {
            if (record === null) {
                await (await this.table()).delete(sessionId);
                this.changed();
                return;
            }
            await this.write(sessionId, recordSchema.parse(record));
        }
        /**
         * Turn automatic settling on or off for one Session (T3 "Auto-settle behavior").
         * @param sessionId - Session to configure.
         * @param enabled - whether the sweep may settle it.
         */
        async setAutoSettle(sessionId, enabled) {
            const record = await this.current(sessionId);
            await this.write(sessionId, { ...record, autoSettleDisabled: !enabled });
        }
    };
})();
export default InboxController;
//# sourceMappingURL=index.js.map