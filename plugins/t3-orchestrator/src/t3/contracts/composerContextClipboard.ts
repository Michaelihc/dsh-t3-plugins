/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code packages/contracts/src/composerContextClipboard.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Schema from "effect/Schema";

import { EnvironmentId, MessageId, ThreadId } from "./baseSchemas.ts";
import { COMPOSER_CONTEXT_MAX_RECORDS, ComposerContextRecord } from "./composerContext.ts";
import { ForwardCompatibleArray } from "./baseSchemas.ts";

export const COMPOSER_CONTEXT_CLIPBOARD_MIME = "web application/x-t3-context-fragment+json";

export const ComposerContextClipboardFragment = Schema.Struct({
  version: Schema.Literal(1),
  source: Schema.Struct({
    environmentId: EnvironmentId,
    threadId: Schema.optional(ThreadId),
    messageId: Schema.optional(MessageId),
  }),
  // Bound raw input before forward-compatible decoding drops unknown records.
  records: Schema.Array(Schema.Unknown)
    .check(Schema.isMaxLength(COMPOSER_CONTEXT_MAX_RECORDS))
    .pipe(Schema.decodeTo(ForwardCompatibleArray(ComposerContextRecord))),
});
export type ComposerContextClipboardFragment = typeof ComposerContextClipboardFragment.Type;
