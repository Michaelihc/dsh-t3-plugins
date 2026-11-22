/**
 * Native agents in the composer model picker: each model label carries its provider or
 * agent mark, and the orchestrator's `t3-acp` provider group is named in the client locale.
 *
 * dsh provider names are Host strings with no locale form, so the group name is localized
 * on the client by wrapping the model directories the picker and `/model` read; the wrap
 * renames only the `t3-acp` group and is withdrawn with the plugin.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
/**
 * A directory state with the native-agents group and failure named `name`.
 * @param state - the directory's state.
 * @param name - localized group name.
 * @returns `state` itself when it has no native-agents entry, otherwise a renamed copy.
 */
export declare function localizeNativeGroup(state: ModelDirectoryState, name: string): ModelDirectoryState;
/** The directory members the localized view replaces; every other member passes through. */
export interface LocalizableDirectory {
    readonly store: SnapshotStore<ModelDirectoryState>;
    load(): Promise<ModelDirectoryState>;
}
/**
 * A view of one directory whose store and `load()` report the native-agents group as `name()`.
 * Store writes, subscriptions, and selection go to the wrapped directory unchanged.
 * @param directory - the session's model directory.
 * @param name - reads the current localized group name.
 * @returns the localized view.
 */
export declare function localizedDirectory<D extends LocalizableDirectory>(directory: D, name: () => string): D;
/**
 * Register the picker integration: the localized directory wrap and the model label.
 * @param ctx - the inbox client context.
 * @param groupName - reads the localized native-agents group name.
 */
export declare function registerModelPicker(ctx: Context, groupName: () => string): void;
//# sourceMappingURL=modelPicker.d.ts.map