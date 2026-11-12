import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Fiber from "effect/Fiber";
import * as Cause from "effect/Cause";
//#region src/t3/shared/mcpResponsePayloads.ts
const SSE_EVENT_SEPARATOR = /(?:\r\n|\r(?!\n)|\n){2}/u;
async function* sseDataLines(response) {
	if (response.body === null) return;
	const decoder = new TextDecoder();
	let buffered = "";
	for await (const chunk of response.body) {
		buffered += decoder.decode(chunk, { stream: true });
		let separator = SSE_EVENT_SEPARATOR.exec(buffered);
		while (separator !== null) {
			const rawEvent = buffered.slice(0, separator.index);
			buffered = buffered.slice(separator.index + separator[0].length);
			const data = rawEvent.split(/\r\n|\r|\n/u).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
			if (data.length > 0) yield data;
			separator = SSE_EVENT_SEPARATOR.exec(buffered);
		}
	}
}
const discardResponseBody = (response) => Effect.promise(() => response.body?.cancel().catch(() => void 0) ?? Promise.resolve());
function responsePayloads(response, onError) {
	if (response.status === 202 || response.status === 204) return Stream.unwrap(discardResponseBody(response).pipe(Effect.as(Stream.empty)));
	if ((response.headers.get("content-type") ?? "").includes("text/event-stream")) return Stream.fromAsyncIterable(sseDataLines(response), onError).pipe(Stream.mapEffect((data) => Effect.try({
		try: () => JSON.parse(data),
		catch: onError
	})));
	return Stream.unwrap(Effect.tryPromise({
		try: () => response.text(),
		catch: onError
	}).pipe(Effect.flatMap((text) => text.trim().length === 0 ? Effect.succeed(Stream.empty) : Effect.try({
		try: () => JSON.parse(text),
		catch: onError
	}).pipe(Effect.map((payload) => Stream.fromIterable([payload]))))));
}
//#endregion
//#region src/t3/mcp/AcpMcpStdioBridge.ts
/** ACP mandates stdio MCP support; HTTP/SSE support varies. */
var AcpMcpBridgeError = class extends Schema.TaggedError()("AcpMcpBridgeError", {
	message: Schema.String,
	cause: Schema.optional(Schema.Defect())
}) {};
const isAcpMcpBridgeError = Schema.is(AcpMcpBridgeError);
const bridgeError = (cause) => isAcpMcpBridgeError(cause) ? cause : new AcpMcpBridgeError({
	message: cause instanceof Error ? cause.message : String(cause),
	cause
});
const decodeJsonLine = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const MCP_PROTOCOL_VERSION = "2025-06-18";
function asEnvelope(value) {
	return typeof value === "object" && value !== null ? value : null;
}
function protocolVersionOf(entry) {
	const result = asEnvelope(entry)?.result;
	const version = typeof result === "object" && result !== null ? result.protocolVersion : void 0;
	return typeof version === "string" && version.length > 0 ? version : null;
}
/**
* One initialized MCP session over T3 Code's HTTP endpoint, terminated when
* the scope closes. Used by the ACP terminal fallback and `t3 thread`.
*/
const mcpToolSession = (options) => {
	const fetchImplementation = options.fetchImplementation ?? fetch;
	let sessionId = null;
	let protocolVersion = null;
	let nextId = 0;
	const headers = () => ({
		accept: "application/json, text/event-stream",
		authorization: options.authorization,
		...sessionId === null ? {} : { "mcp-session-id": sessionId },
		...protocolVersion === null ? {} : { "mcp-protocol-version": protocolVersion }
	});
	const send = Effect.fn("AcpMcpStdioBridge.send")(function* (message) {
		const response = yield* Effect.tryPromise({
			try: (signal) => fetchImplementation(options.endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...headers()
				},
				body: JSON.stringify(message),
				signal
			}),
			catch: bridgeError
		});
		sessionId = response.headers.get("mcp-session-id") ?? sessionId;
		if (!response.ok) {
			yield* discardResponseBody(response);
			return yield* new AcpMcpBridgeError({ message: `T3 Code MCP endpoint responded with HTTP ${response.status}.` });
		}
		const payloads = yield* Stream.runCollect(responsePayloads(response, bridgeError));
		for (const payload of payloads) protocolVersion = protocolVersionOf(payload) ?? protocolVersion;
		return payloads;
	});
	const request = Effect.fn("AcpMcpStdioBridge.request")(function* (method, params) {
		const id = `t3-cli-${nextId++}`;
		const envelope = asEnvelope((yield* send({
			jsonrpc: "2.0",
			id,
			method,
			params
		})).find((entry) => asEnvelope(entry)?.id === id));
		if (envelope === null || envelope.error !== void 0) return yield* new AcpMcpBridgeError({ message: `T3 Code MCP ${method} failed${envelope?.error === void 0 ? "." : `: ${JSON.stringify(envelope.error)}`}` });
		return envelope;
	});
	const terminate = Effect.suspend(() => sessionId === null ? Effect.void : Effect.tryPromise({
		try: () => fetchImplementation(options.endpoint, {
			method: "DELETE",
			headers: headers()
		}),
		catch: bridgeError
	}).pipe(Effect.flatMap(discardResponseBody), Effect.ignore));
	return Effect.gen(function* () {
		yield* Effect.addFinalizer(() => terminate);
		yield* request("initialize", {
			protocolVersion: MCP_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: {
				name: options.clientName,
				version: "0.0.0"
			}
		});
		yield* send({
			jsonrpc: "2.0",
			method: "notifications/initialized"
		});
		return { call: (tool, args) => request("tools/call", {
			name: tool,
			arguments: args
		}).pipe(Effect.map((envelope) => envelope.result)) };
	});
};
/**
* This is the terminal fallback for ACP agents that accept `mcpServers` in
* `session/new` but fail to expose those tools to their model. Compliant ACP
* agents continue to use the stdio bridge above.
*/
function callAcpMcpTool(options) {
	return mcpToolSession({
		...options,
		clientName: "t3-code-acp-cli"
	}).pipe(Effect.flatMap((session) => session.call(options.tool, options.arguments)), Effect.scoped);
}
function runAcpMcpStdioBridge(options) {
	const fetchImplementation = options.fetchImplementation ?? fetch;
	return Effect.gen(function* () {
		let sessionId = null;
		let protocolVersion = null;
		const running = /* @__PURE__ */ new Set();
		const writeMessage = (message) => Effect.sync(() => {
			options.output.write(`${JSON.stringify(message)}\n`);
		});
		const handleServerPayload = Effect.fn("AcpMcpStdioBridge.handleServerPayload")(function* (payload) {
			for (const entry of Array.isArray(payload) ? payload : [payload]) {
				protocolVersion = protocolVersionOf(entry) ?? protocolVersion;
				yield* writeMessage(entry);
			}
		});
		const respondWithError = (requestId, message, code = -32603) => writeMessage({
			jsonrpc: "2.0",
			id: requestId ?? null,
			error: {
				code,
				message
			}
		});
		const forward = Effect.fn("AcpMcpStdioBridge.forward")(function* (line, envelope) {
			const response = yield* Effect.tryPromise({
				try: (signal) => fetchImplementation(options.endpoint, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						accept: "application/json, text/event-stream",
						authorization: options.authorization,
						...sessionId === null ? {} : { "mcp-session-id": sessionId },
						...protocolVersion === null ? {} : { "mcp-protocol-version": protocolVersion }
					},
					body: line,
					signal
				}),
				catch: bridgeError
			});
			sessionId = response.headers.get("mcp-session-id") ?? sessionId;
			if (!response.ok) {
				if (envelope.id !== void 0) yield* respondWithError(envelope.id, `T3 Code MCP endpoint responded with HTTP ${response.status}.`);
				return yield* discardResponseBody(response);
			}
			yield* Stream.runForEach(responsePayloads(response, bridgeError), handleServerPayload);
		}, (effect, _line, envelope) => effect.pipe(Effect.catchCause((cause) => {
			if (envelope.id === void 0) return Effect.void;
			const error = Cause.squash(cause);
			return respondWithError(envelope.id, `T3 Code MCP bridge request failed: ${error instanceof Error ? error.message : String(error)}`);
		})));
		let sessionBarrier = Effect.void;
		let sessionBarrierPending = false;
		const launch = Effect.fn("AcpMcpStdioBridge.launch")(function* (task) {
			const fiber = yield* Effect.forkChild(task);
			running.add(fiber);
			yield* Effect.forkChild(Fiber.await(fiber).pipe(Effect.andThen(Effect.sync(() => {
				running.delete(fiber);
			}))));
		});
		const dispatch = Effect.fn("AcpMcpStdioBridge.dispatch")(function* (line) {
			if (line.trim().length === 0) return;
			const parsed = decodeJsonLine(line);
			if (Option.isNone(parsed)) return yield* respondWithError(null, "Parse error", -32700);
			const envelope = asEnvelope(parsed.value);
			if (envelope === null) return;
			const isResponse = envelope.id !== void 0 && ("result" in envelope || "error" in envelope);
			const isSessionHandshake = envelope.method === "initialize" || envelope.method === "notifications/initialized";
			if (isResponse) return yield* launch(forward(line, envelope));
			if (isSessionHandshake) {
				const prior = sessionBarrier;
				const fiber = yield* Effect.forkChild(prior.pipe(Effect.andThen(forward(line, envelope))));
				running.add(fiber);
				const barrier = Fiber.await(fiber).pipe(Effect.asVoid);
				sessionBarrier = barrier;
				sessionBarrierPending = true;
				yield* Effect.forkChild(Fiber.await(fiber).pipe(Effect.andThen(Effect.sync(() => {
					running.delete(fiber);
					if (sessionBarrier === barrier) sessionBarrierPending = false;
				}))));
				return;
			}
			return yield* launch(sessionBarrierPending ? sessionBarrier.pipe(Effect.andThen(forward(line, envelope))) : forward(line, envelope));
		});
		yield* Stream.fromAsyncIterable(options.input, bridgeError).pipe(Stream.map((chunk) => typeof chunk === "string" ? Buffer.from(chunk) : chunk), Stream.decodeText(), Stream.splitLines, Stream.runForEach(dispatch), Effect.ignoreCause);
		yield* Fiber.awaitAll(running);
	});
}
/** Avoid heavy imports on the ACP first-message path. */
async function runAcpMcpCliFastPath(command, args) {
	const endpoint = process.env.T3_ACP_MCP_ENDPOINT;
	const authorization = process.env.T3_ACP_MCP_AUTHORIZATION;
	if (endpoint === void 0 || authorization === void 0) {
		process.stderr.write(`${command} requires T3_ACP_MCP_ENDPOINT and T3_ACP_MCP_AUTHORIZATION.\n`);
		process.exitCode = 2;
		return;
	}
	if (command === "acp-mcp-bridge") {
		await Effect.runPromise(runAcpMcpStdioBridge({
			endpoint,
			authorization,
			input: process.stdin,
			output: process.stdout
		}));
		return;
	}
	const [tool, argumentsJson] = args;
	if (tool === void 0 || argumentsJson === void 0) {
		process.stderr.write("acp-mcp-call requires <tool> and <arguments-json>.\n");
		process.exitCode = 2;
		return;
	}
	let parsed;
	try {
		parsed = JSON.parse(argumentsJson);
	} catch {
		process.stderr.write("acp-mcp-call arguments must be valid JSON.\n");
		process.exitCode = 2;
		return;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		process.stderr.write("acp-mcp-call arguments must be a JSON object.\n");
		process.exitCode = 2;
		return;
	}
	let result = await Effect.runPromise(callAcpMcpTool({
		endpoint,
		authorization,
		tool,
		arguments: parsed
	}));
	if (typeof result === "object" && result !== null && "structuredContent" in result && result.structuredContent !== void 0 && "content" in result && Array.isArray(result.content)) {
		const encoded = JSON.stringify(result.structuredContent);
		result = {
			...result,
			content: result.content.filter((part) => !(typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && part.text === encoded))
		};
	}
	process.stdout.write(`${JSON.stringify(result)}\n`);
}
//#endregion
//#region src/bridge-main.ts
await runAcpMcpCliFastPath("acp-mcp-bridge", []);
//#endregion
export {};
