/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/serverSettings.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.). The lifted code only reads settings, so this keeps
// T3's service tag with `getSettings` and `managedPolicy`. dsh has no T3 settings file: the
// plugin supplies T3's defaults (`DEFAULT_SERVER_SETTINGS`), i.e. every provider instance is
// enabled for every project and there are no model preferences or favorites. See PORTING.md.
import type { ManagedPolicySummary, ServerSettings, ServerSettingsError } from "./contracts/index.ts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class ServerSettingsService extends Context.Service<
  ServerSettingsService,
  {
    /** The administrator's policy as clients see it; absent when unmanaged. */
    readonly managedPolicy?: ManagedPolicySummary | undefined;

    readonly getSettings: Effect.Effect<ServerSettings, ServerSettingsError>;
  }
>()("t3/serverSettings/ServerSettingsService") {}
