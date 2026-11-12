/* oxlint-disable -- upstream formatting is kept so re-syncs stay byte-comparable. */
// Lifted verbatim from T3 Code apps/server/src/requestUrl.ts @ 4c8eb1dfd5 (MIT, Copyright (c) 2026 T3 Tools Inc.).
// Only import specifiers are rewritten; regenerate with scripts/sync-t3.mjs. See PORTING.md.
import * as Option from "effect/Option";
import { HttpServerRequest } from "effect/http";

/**
 * `HttpServerRequest.toURL` that honors `X-Forwarded-Proto: https`. Effect 4.1
 * stopped reading it, but TLS-terminating proxies in front of the server
 * (Tailscale Serve, tunnels) rely on it for OAuth, DPoP and pairing URLs.
 */
export const requestUrl = (request: HttpServerRequest.HttpServerRequest): Option.Option<URL> =>
  HttpServerRequest.toURL(
    request.headers["x-forwarded-proto"] === "https" && request.protocol !== "https"
      ? request.modify({ protocol: "https" })
      : request,
  );
