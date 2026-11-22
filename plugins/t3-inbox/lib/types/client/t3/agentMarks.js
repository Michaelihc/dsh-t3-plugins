import { jsx as _jsx } from "react/jsx-runtime";
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives';
/** The orchestrator's model route for native ACP agents (its `ACP_SESSION_PROVIDER`). */
export const NATIVE_AGENT_PROVIDER = 't3-acp';
const AGENT_MARKS = {
    'kimi-code': { viewBox: '0 0 24 24', body: _jsx("path", { d: "M19.514 7.342C19.711 7.862 19.814 8.413 19.816 8.969C19.816 12.494 15.998 14.697 12.946 12.934C11.529 12.116 10.657 10.605 10.657 8.969C10.657 5.646 14.085 3.431 17.115 4.793C15.26 3.373 12.99 2.607 10.655 2.612C4.772 2.614 0.005 7.381 0 13.265C0.002 19.148 4.772 23.918 10.655 23.92C16.538 23.916 21.306 19.147 21.31 13.265C21.312 11.155 20.687 9.095 19.514 7.342ZM14.841 4.666C14.841 8.191 18.657 10.395 21.709 8.632C23.127 7.814 24 6.302 24 4.666C24 1.14 20.184-1.061 17.13 0.699C15.714 1.519 14.841 3.03 14.841 4.666" }) },
    'codex': { viewBox: '0 0 24 24', body: _jsx("path", { d: "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" }) },
    'qwen-code': { viewBox: '0 0 141.38 140', body: _jsx("path", { d: "m140.93 85-16.35-28.33-1.93-3.34 8.66-15a3.323 3.323 0 0 0 0-3.34l-9.62-16.67c-.3-.51-.72-.93-1.22-1.22s-1.07-.45-1.67-.45H82.23l-8.66-15a3.33 3.33 0 0 0-2.89-1.67H51.43c-.59 0-1.17.16-1.66.45-.5.29-.92.71-1.22 1.22L32.19 29.98l-1.92 3.33H12.96c-.59 0-1.17.16-1.66.45-.5.29-.93.71-1.22 1.22L.45 51.66a3.323 3.323 0 0 0 0 3.34l18.28 31.67-8.66 15a3.32 3.32 0 0 0 0 3.34l9.62 16.67c.3.51.72.93 1.22 1.22s1.07.45 1.67.45h36.56l8.66 15a3.35 3.35 0 0 0 2.89 1.67h19.25a3.34 3.34 0 0 0 2.89-1.67l18.28-31.67h17.32c.6 0 1.17-.16 1.67-.45s.92-.71 1.22-1.22l9.62-16.67a3.323 3.323 0 0 0 0-3.34ZM51.44 3.33 61.07 20l-9.63 16.66h76.98l-9.62 16.66H45.67l-11.54-20zM57.21 120H22.58l9.63-16.67h19.25l-38.5-66.67h19.25l9.62 16.67L68.78 100l-11.55 20Zm61.59-33.34-9.62-16.67-38.49 66.67-9.63-16.67 9.63-16.66 26.94-46.67h23.1l17.32 30z" }) },
    'qoder': { viewBox: '0 0 16 16', body: _jsx("path", { d: "M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7c1.5 0 2.9-.47 4.05-1.28l1.12 1.12a.75.75 0 1 0 1.06-1.06l-1.12-1.12A6.97 6.97 0 0 0 15 8c0-3.866-3.134-7-7-7Zm0 2c2.761 0 5 2.239 5 5s-2.239 5-5 5-5-2.239-5-5 2.239-5 5-5Z" }) },
    'minimax-code': { viewBox: '0 0 16 16', body: _jsx("path", { d: "M2 3h3l3 5 3-5h3v10h-2V6.5l-4 6-4-6V13H2V3Z" }) },
    'glm-acp-agent': { viewBox: '0 0 16 16', body: _jsx("path", { fillRule: "evenodd", d: "M8.07 1.333L6.618 3.302H.435L1.887 1.333h6.184zM15.503 12.699L14.052 14.667h-6.161l1.449-1.968h6.163zM16 1.333L6.176 14.667H0L9.824 1.333H16z" }) },
};
/**
 * Whether a model route draws a provider mark.
 * @param provider - the model route's provider id.
 * @param model - the route's model id; on `t3-acp` this is the agent id.
 * @returns true when {@link ProviderMark} renders a glyph for the route.
 */
export function hasProviderMark(provider, model) {
    return provider === NATIVE_AGENT_PROVIDER ? Object.hasOwn(AGENT_MARKS, model) : provider.toLowerCase().includes('deepseek');
}
/**
 * The mark of one model route at the caller's size, or nothing for routes without one.
 * @param props - route ids, the glyph's pixel size, and SVG props such as `className`.
 * @returns the mark, or null.
 */
export function ProviderMark({ provider, model, size, ...props }) {
    if (provider === NATIVE_AGENT_PROVIDER) {
        const mark = Object.hasOwn(AGENT_MARKS, model) ? AGENT_MARKS[model] : undefined;
        if (mark === undefined)
            return null;
        return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: mark.viewBox, fill: "currentColor", "aria-hidden": true, "data-agent-mark": model, ...props, children: mark.body }));
    }
    return provider.toLowerCase().includes('deepseek') ? _jsx(FishLogo, { size: size, className: props.className }) : null;
}
//# sourceMappingURL=agentMarks.js.map