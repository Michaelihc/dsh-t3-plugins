/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code packages/contracts/src/usageLimitSourceId.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Schema from "effect/Schema";

// Separate module avoids an import cycle between settings and usage-limit contracts.
export const UsageLimitSourceId = Schema.String.pipe(Schema.brand("UsageLimitSourceId"));
export type UsageLimitSourceId = typeof UsageLimitSourceId.Type;
