/* oxlint-disable -- upstream formatting is kept so re-syncs stay comparable. */
// dsh boundary for T3 Code apps/server/src/auth/EnvironmentAuth.ts @ 4c8eb1dfd5
// (MIT, Copyright (c) 2026 T3 Tools Inc.): only parseBearerToken and its prefix, copied verbatim.
// dsh has no T3 environment sessions or OAuth clients.
import type { HttpServerRequest } from "effect/http";

const AUTHORIZATION_PREFIX = "Bearer ";

export function parseBearerToken(request: HttpServerRequest.HttpServerRequest): string | null {
  const header = request.headers["authorization"];
  if (typeof header !== "string" || !/^Bearer /i.test(header)) {
    return null;
  }
  const token = header.slice(AUTHORIZATION_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}
