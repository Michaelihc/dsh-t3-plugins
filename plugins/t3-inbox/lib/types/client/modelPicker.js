import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives';
import { NATIVE_AGENT_PROVIDER, ProviderMark } from "./t3/agentMarks.js";
import css from './ModelLabel.module.css';
/**
 * A directory state with the native-agents group and failure named `name`.
 * @param state - the directory's state.
 * @param name - localized group name.
 * @returns `state` itself when it has no native-agents entry, otherwise a renamed copy.
 */
export function localizeNativeGroup(state, name) {
    const named = (item) => item.id === NATIVE_AGENT_PROVIDER && item.name !== name ? { ...item, name } : item;
    const groups = state.groups.map(named);
    const failures = state.failures.map(named);
    const changed = groups.some((group, i) => group !== state.groups[i]) || failures.some((failure, i) => failure !== state.failures[i]);
    return changed ? { ...state, groups, failures } : state;
}
/**
 * A view of one directory whose store and `load()` report the native-agents group as `name()`.
 * Store writes, subscriptions, and selection go to the wrapped directory unchanged.
 * @param directory - the session's model directory.
 * @param name - reads the current localized group name.
 * @returns the localized view.
 */
export function localizedDirectory(directory, name) {
    const source = directory.store;
    let last;
    const store = {
        getSnapshot: () => {
            const state = source.getSnapshot();
            const label = name();
            if (last?.state !== state || last.name !== label)
                last = { state, name: label, view: localizeNativeGroup(state, label) };
            return last.view;
        },
        subscribe: listener => source.subscribe(listener),
        update: (mutator) => { source.update(mutator); },
        set: (next) => { source.set(next); },
    };
    return new Proxy(directory, {
        get(target, key) {
            if (key === 'store')
                return store;
            if (key === 'load')
                return async () => localizeNativeGroup(await target.load(), name());
            const value = Reflect.get(target, key, target);
            if (typeof value !== 'function')
                return value;
            const bound = value.bind(target);
            return bound;
        },
    });
}
/**
 * Register the picker integration: the localized directory wrap and the model label.
 * @param ctx - the inbox client context.
 * @param groupName - reads the localized native-agents group name.
 */
export function registerModelPicker(ctx, groupName) {
    ctx.inject(['modelDirectories'], (scope) => {
        const resolver = scope.modelDirectories;
        const views = new WeakMap();
        scope.effect(() => {
            // An own property shadows the prototype method; deleting it restores the original.
            const directoryFor = resolver.directoryFor.bind(resolver);
            resolver.directoryFor = (sessionId) => {
                const directory = directoryFor(sessionId);
                let view = views.get(directory);
                if (view === undefined) {
                    view = localizedDirectory(directory, groupName);
                    views.set(directory, view);
                }
                return view;
            };
            return () => { Reflect.deleteProperty(resolver, 'directoryFor'); };
        }, 't3-inbox: localized native-agents group');
    });
    const resolveText = (text) => ctx.locale.resolveText(text);
    function ModelLabel({ provider, model, placement }) {
        const badge = model.badge === undefined
            ? null
            : _jsx(Tag, { className: css.badge, tone: model.badge.tone, children: resolveText(model.badge.text) });
        return (_jsxs("span", { className: css.label, children: [_jsx(ProviderMark, { provider: provider.id, model: model.id, size: 14, className: css.mark }), placement === 'trigger' ? badge : null, _jsx("span", { className: css.name, children: model.name }), placement === 'trigger' ? null : badge] }));
    }
    ctx.slots.inject('conversation.input.model.label', () => ctx.slots.register({ name: 'conversation.input.model.label' }, ModelLabel));
}
//# sourceMappingURL=modelPicker.js.map