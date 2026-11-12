/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code packages/contracts/src/threadTitle.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Schema from "effect/Schema";

import { CommandId, IsoDateTime } from "./baseSchemas.ts";

export const ThreadTitleRegeneration = Schema.Struct({
  requestId: CommandId,
  startedAt: IsoDateTime,
});
export type ThreadTitleRegeneration = typeof ThreadTitleRegeneration.Type;
