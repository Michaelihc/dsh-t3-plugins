/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/provider/ProviderRegistry.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): T3's tag with the two members the lifted service
// calls. dsh builds `ServerProvider` snapshots from its configured ACP agents (probed with
// initialize and a disposable session/new, as T3's ACP Registry driver does) and from dsh
// itself; see src/dsh/providers.ts.
import type { ProviderInstanceId, ServerProvider } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class ProviderRegistry extends Context.Service<
  ProviderRegistry,
  {
    readonly getProviders: Effect.Effect<ReadonlyArray<ServerProvider>>;

    /** Unknown instance ids return the cached list without error. */
    readonly refreshInstance: (
      instanceId: ProviderInstanceId,
    ) => Effect.Effect<ReadonlyArray<ServerProvider>>;
  }
>()("t3/provider/ProviderRegistry") {}
