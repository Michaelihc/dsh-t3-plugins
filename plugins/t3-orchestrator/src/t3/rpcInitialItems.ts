/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code apps/server/src/rpcInitialItems.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

export function rpcInitialItems<A>(items: ReadonlyArray<A>): Stream.Stream<A> {
  let pending: ReadonlyArray<A> | undefined = items;
  return Stream.unwrap(
    Effect.sync(() => {
      const initial = pending;
      // concat retains the initial stream during live tailing; release delivered snapshots and rows.
      pending = undefined;
      return initial === undefined ? Stream.empty : Stream.fromIterable(initial);
    }),
  );
}
