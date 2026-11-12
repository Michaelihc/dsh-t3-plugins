/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/orchestration-v2/ProviderAdapterRegistry.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): T3's tag with `list`, the instance ids that have a
// V2 orchestration adapter. In dsh those are the configured ACP agents and dsh itself.
import type { ProviderInstanceId } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export interface ProviderAdapterRegistryV2Shape {
  readonly list: () => Effect.Effect<ReadonlyArray<ProviderInstanceId>>;
}

export class ProviderAdapterRegistryV2 extends Context.Service<
  ProviderAdapterRegistryV2,
  ProviderAdapterRegistryV2Shape
>()("t3/orchestration-v2/ProviderAdapterRegistry/ProviderAdapterRegistryV2") {}
