/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code packages/contracts/src/orchestrationDispatch.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export class OrchestrationDispatchCommandError extends Schema.TaggedError<OrchestrationDispatchCommandError>()(
  "OrchestrationDispatchCommandError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect()),
    bootstrapThreadDisposition: Schema.optional(Schema.Literals(["deleted", "not-created"])),
  },
) {}
