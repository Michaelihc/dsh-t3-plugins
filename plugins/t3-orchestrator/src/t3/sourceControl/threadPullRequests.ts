/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/sourceControl/threadPullRequests.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). dsh threads carry no pull request links (no PR
// watches), so lists are always empty and the key normalizer is never reached; it returns the
// link's own host field when present. See PORTING.md "Forced deviations".
import type { ThreadPullRequestLink } from "../contracts/index.ts";

export { visibleThreadPullRequests } from "../shared/threadPullRequests.ts";

export const normalizeThreadPullRequestKey = (
  link: ThreadPullRequestLink,
): { readonly host: string } => ({
  host: (link as { readonly host?: string }).host ?? "",
});
