/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/ThreadSettlementService.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): only isSnoozed and its toMillis helper, copied
// verbatim; the settlement candidate type is the thread shell. dsh threads never snooze.
import type { OrchestrationV2ThreadShell } from "../contracts/index.ts";
import * as DateTime from "effect/DateTime";

declare namespace ProjectionStore {
  type ProjectionSettlementCandidate = OrchestrationV2ThreadShell;
}

function toMillis(value: DateTime.Utc | null | undefined): number | null {
  return value == null ? null : DateTime.toEpochMillis(value);
}

export function isSnoozed(
  thread: Pick<
    ProjectionStore.ProjectionSettlementCandidate,
    | "snoozedUntil"
    | "snoozedAt"
    | "latestRunCompletedAt"
    | "status"
    | "pendingRuntimeRequest"
    | "pendingGuestMessageCount"
  >,
  nowMs: number,
): boolean {
  const snoozedUntilMs = toMillis(thread.snoozedUntil);
  if (snoozedUntilMs === null || snoozedUntilMs <= nowMs) return false;
  // Same as the client: a waiting guest message wakes the thread, and the snooze stays stored.
  if ((thread.pendingGuestMessageCount ?? 0) > 0) return false;
  const snoozedAtMs = toMillis(thread.snoozedAt);
  if (
    thread.pendingRuntimeRequest !== null &&
    (thread.pendingRuntimeRequest.kind !== "user_input" ||
      snoozedAtMs === null ||
      DateTime.toEpochMillis(thread.pendingRuntimeRequest.createdAt) > snoozedAtMs)
  ) {
    return false;
  }
  const completedAtMs = toMillis(thread.latestRunCompletedAt);
  const wokeOnError =
    thread.status === "failed" &&
    (snoozedAtMs === null || (completedAtMs !== null && completedAtMs > snoozedAtMs));
  return !wokeOnError;
}
