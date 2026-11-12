/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/environment/ServerEnvironment.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). The lifted code reads only the environment id, so
// this keeps T3's two service tags with that member. The dsh Host supplies a stable id
// (src/dsh/layers.ts). See PORTING.md.
import type { EnvironmentId } from "../contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class ServerEnvironment extends Context.Service<
  ServerEnvironment,
  {
    readonly getEnvironmentId: Effect.Effect<EnvironmentId>;
  }
>()("t3/environment/ServerEnvironment") {}

export class ServerEnvironmentIdentity extends Context.Service<
  ServerEnvironmentIdentity,
  {
    readonly getEnvironmentId: Effect.Effect<EnvironmentId>;
  }
>()("t3/environment/ServerEnvironment/ServerEnvironmentIdentity") {}
