/**
 * Provider marks shared by the inbox rows and the composer model picker: the DeepSeek
 * fish for DeepSeek routes, and each native agent's mark for the orchestrator's `t3-acp`
 * route, keyed by the orchestrator's agent id.
 *
 * Agent glyphs are the single-colour Agent Client Protocol registry icons
 * (`https://cdn.agentclientprotocol.com/registry/v1/latest/<registry id>.svg`), which the
 * registry publishes for clients to identify each agent; Codex uses the `codex-acp` entry.
 * The marks remain their owners' trademarks and are shown only to name the agent.
 */
import type { ReactNode } from 'react';
import type { IconProps } from './icons.tsx';
/** The orchestrator's model route for native ACP agents (its `ACP_SESSION_PROVIDER`). */
export declare const NATIVE_AGENT_PROVIDER = "t3-acp";
/**
 * Whether a model route draws a provider mark.
 * @param provider - the model route's provider id.
 * @param model - the route's model id; on `t3-acp` this is the agent id.
 * @returns true when {@link ProviderMark} renders a glyph for the route.
 */
export declare function hasProviderMark(provider: string, model: string): boolean;
/**
 * The mark of one model route at the caller's size, or nothing for routes without one.
 * @param props - route ids, the glyph's pixel size, and SVG props such as `className`.
 * @returns the mark, or null.
 */
export declare function ProviderMark({ provider, model, size, ...props }: IconProps & {
    readonly provider: string;
    readonly model: string;
    readonly size: number;
}): ReactNode;
//# sourceMappingURL=agentMarks.d.ts.map