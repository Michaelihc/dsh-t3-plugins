/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/CommandReceiptStore.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). The receipt schema is copied verbatim; the store keeps
// only `getByCommandId`, the member the lifted code reads. dsh's receipts live in the orchestrator
// store (src/dsh/engine.ts). See PORTING.md.
import { CommandId, NonNegativeInt, ThreadId } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const CommandReceiptV2Status = Schema.Literals(["accepted", "rejected"]);
export type CommandReceiptV2Status = typeof CommandReceiptV2Status.Type;

export const CommandReceiptV2 = Schema.Struct({
  commandId: CommandId,
  threadId: ThreadId,
  commandType: Schema.String,
  acceptedAt: Schema.DateTimeUtc,
  resultSequence: NonNegativeInt,
  status: CommandReceiptV2Status,
  error: Schema.NullOr(Schema.String),
});
export type CommandReceiptV2 = typeof CommandReceiptV2.Type;

export class CommandReceiptStoreV2Error extends Schema.TaggedError<CommandReceiptStoreV2Error>()(
  "CommandReceiptStoreV2Error",
  { cause: Schema.optional(Schema.Defect()) },
) {}

export interface CommandReceiptStoreV2Shape {
  readonly getByCommandId: (
    commandId: CommandId,
  ) => Effect.Effect<Option.Option<CommandReceiptV2>, CommandReceiptStoreV2Error>;
}

export class CommandReceiptStoreV2 extends Context.Service<
  CommandReceiptStoreV2,
  CommandReceiptStoreV2Shape
>()("t3/orchestration-v2/CommandReceiptStore/CommandReceiptStoreV2") {}
