window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-experimental-t3-inbox",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let zod = require("zod");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../typert/protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		//#endregion
		//#region lib/typert.remote-client.js
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0$schema$value ??= zod.z.array(zod.z.string());
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_result$schema$value ??= zod.z.record(zod.z.string(), zod.z.union([zod.z.literal(null), zod.z.string()]));
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_follow_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_follow_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_follow_result$schema$value ??= zod.z.object({
			"records": zod.z.record(zod.z.string(), zod.z.object({
				"settledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the Session was settled, or null while active."),
				"settleReason": zod.z.union([
					zod.z.literal(null),
					zod.z.literal("auto"),
					zod.z.literal("manual")
				]).readonly().describe("Who settled it."),
				"unsettledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional().describe("ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."),
				"snoozedUntil": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO wake time, or null when not snoozed."),
				"snoozedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the snooze was set; activity after it wakes the Session early."),
				"autoSettleDisabled": zod.z.boolean().readonly().optional().describe("Set from the row menu's \"Auto-settle behavior: Disabled\".")
			})).readonly().readonly().describe("Overlays keyed by Session id; Sessions without a record are active."),
			"autoSettleAfterDays": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().describe("Idle days before the Host sweep settles a Session; null when auto-settle is off."),
			"revision": zod.z.number().readonly().describe("Monotonic change counter for this Host process."),
			"threads": zod.z.record(zod.z.string(), zod.z.object({
				"listed": zod.z.boolean().readonly().describe("False for subagent threads, which T3 lists only inside their parent."),
				"parentSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("The parent thread's Session id."),
				"blockedOnThreadWait": zod.z.boolean().readonly().describe("The running turn only waits on another thread."),
				"backgroundWork": zod.z.boolean().readonly().describe("Settled, but delegated work it waits on is still running.")
			})).readonly().readonly().describe("Orchestrator threads by Session id; empty without the orchestrator plugin.")
		});
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_list_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_list_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_list_result$schema$value ??= zod.z.object({
			"records": zod.z.record(zod.z.string(), zod.z.object({
				"settledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the Session was settled, or null while active."),
				"settleReason": zod.z.union([
					zod.z.literal(null),
					zod.z.literal("auto"),
					zod.z.literal("manual")
				]).readonly().describe("Who settled it."),
				"unsettledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional().describe("ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."),
				"snoozedUntil": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO wake time, or null when not snoozed."),
				"snoozedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the snooze was set; activity after it wakes the Session early."),
				"autoSettleDisabled": zod.z.boolean().readonly().optional().describe("Set from the row menu's \"Auto-settle behavior: Disabled\".")
			})).readonly().readonly().describe("Overlays keyed by Session id; Sessions without a record are active."),
			"autoSettleAfterDays": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().describe("Idle days before the Host sweep settles a Session; null when auto-settle is off."),
			"revision": zod.z.number().readonly().describe("Monotonic change counter for this Host process."),
			"threads": zod.z.record(zod.z.string(), zod.z.object({
				"listed": zod.z.boolean().readonly().describe("False for subagent threads, which T3 lists only inside their parent."),
				"parentSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("The parent thread's Session id."),
				"blockedOnThreadWait": zod.z.boolean().readonly().describe("The running turn only waits on another thread."),
				"backgroundWork": zod.z.boolean().readonly().describe("Settled, but delegated work it waits on is still running.")
			})).readonly().readonly().describe("Orchestrator threads by Session id; empty without the orchestrator plugin.")
		});
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1$schema$value ??= zod.z.union([zod.z.literal(null), zod.z.object({
			"settledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the Session was settled, or null while active."),
			"settleReason": zod.z.union([
				zod.z.literal(null),
				zod.z.literal("auto"),
				zod.z.literal("manual")
			]).readonly().describe("Who settled it."),
			"unsettledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional().describe("ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."),
			"snoozedUntil": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO wake time, or null when not snoozed."),
			"snoozedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the snooze was set; activity after it wakes the Session early."),
			"autoSettleDisabled": zod.z.boolean().readonly().optional().describe("Set from the row menu's \"Auto-settle behavior: Disabled\".")
		})]);
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1$schema$value ??= zod.z.boolean();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_result$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_result$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_result$schema$value ??= zod.z.void();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0_strict$schema$value ??= zod.z.array(zod.z.string());
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1_strict$schema$value ??= zod.z.union([zod.z.literal(null), zod.z.strictObject({
			"settledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the Session was settled, or null while active."),
			"settleReason": zod.z.union([
				zod.z.literal(null),
				zod.z.literal("auto"),
				zod.z.literal("manual")
			]).readonly().describe("Who settled it."),
			"unsettledAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional().describe("ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."),
			"snoozedUntil": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO wake time, or null when not snoozed."),
			"snoozedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("ISO instant the snooze was set; activity after it wakes the Session early."),
			"autoSettleDisabled": zod.z.boolean().readonly().optional().describe("Set from the row menu's \"Auto-settle behavior: Disabled\".")
		})]);
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1_strict$schema$value ??= zod.z.boolean();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0_strict$schema$value ??= zod.z.string();
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@deepseek-ai/dsh-experimental-t3-inbox",
			methods: {
				"inbox/branches": {
					service: "inboxController",
					description: "Current git branch of each working directory, for the sidebar's branch line.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "cwds",
						description: "Session working directories.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/branches:cwds",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0$schema,
							jsonSchema: {
								"type": "array",
								"items": { "type": "string" }
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/branches:cwds",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_parameter_0_strict$schema,
							jsonSchema: {
								"type": "array",
								"items": { "type": "string" }
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/branches:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_branches_result$schema,
						description: "branch name, short commit for a detached head, or null outside a repository.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 332,
						"column": 9
					}
				},
				"inbox/follow": {
					service: "inboxController",
					description: "Follow inbox changes made from any client or by the Host sweep.",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox/types#InboxSnapshot",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_follow_result$schema,
						description: "the current snapshot, then one snapshot per change.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 250,
						"column": 10
					}
				},
				"inbox/list": {
					service: "inboxController",
					description: "Read every inbox overlay.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox/types#InboxSnapshot",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_list_result$schema,
						description: "overlays keyed by Session id, the auto-settle threshold, and the change revision.",
						jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 234,
						"column": 9
					}
				},
				"inbox/restore": {
					service: "inboxController",
					description: "Put back the overlay a Session had before an undone settle or snooze.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to restore.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/restore:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/restore:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "record",
						description: "the earlier overlay, or null when it had none.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/restore:record",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1$schema,
							jsonSchema: { "oneOf": [{
								"type": "null",
								"const": null
							}, {
								"type": "object",
								"properties": {
									"settledAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the Session was settled, or null while active."
									},
									"settleReason": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, {
											"type": "string",
											"enum": ["auto", "manual"]
										}],
										"description": "Who settled it."
									},
									"unsettledAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."
									},
									"snoozedUntil": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO wake time, or null when not snoozed."
									},
									"snoozedAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the snooze was set; activity after it wakes the Session early."
									},
									"autoSettleDisabled": {
										"type": "boolean",
										"description": "Set from the row menu's \"Auto-settle behavior: Disabled\"."
									}
								},
								"required": [
									"settledAt",
									"settleReason",
									"snoozedUntil",
									"snoozedAt"
								],
								"additionalProperties": true
							}] }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/restore:record",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_parameter_1_strict$schema,
							jsonSchema: { "oneOf": [{
								"type": "null",
								"const": null
							}, {
								"type": "object",
								"properties": {
									"settledAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the Session was settled, or null while active."
									},
									"settleReason": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, {
											"type": "string",
											"enum": ["auto", "manual"]
										}],
										"description": "Who settled it."
									},
									"unsettledAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the user unsettled it by hand (T3 `settledOverride: \"active\"`); the sweep then leaves it alone."
									},
									"snoozedUntil": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO wake time, or null when not snoozed."
									},
									"snoozedAt": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }],
										"description": "ISO instant the snooze was set; activity after it wakes the Session early."
									},
									"autoSettleDisabled": {
										"type": "boolean",
										"description": "Set from the row menu's \"Auto-settle behavior: Disabled\"."
									}
								},
								"required": [
									"settledAt",
									"settleReason",
									"snoozedUntil",
									"snoozedAt"
								],
								"additionalProperties": false
							}] }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/restore:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_restore_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 349,
						"column": 9
					}
				},
				"inbox/setAutoSettle": {
					service: "inboxController",
					description: "Turn automatic settling on or off for one Session (T3 \"Auto-settle behavior\").",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to configure.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/setAutoSettle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/setAutoSettle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "enabled",
						description: "whether the sweep may settle it.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/setAutoSettle:enabled",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1$schema,
							jsonSchema: { "type": "boolean" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/setAutoSettle:enabled",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_parameter_1_strict$schema,
							jsonSchema: { "type": "boolean" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/setAutoSettle:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_setAutoSettle_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 364,
						"column": 9
					}
				},
				"inbox/settle": {
					service: "inboxController",
					description: "Move a Session out of the inbox until new activity arrives.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to settle.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/settle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/settle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/settle:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_settle_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 278,
						"column": 9
					}
				},
				"inbox/snooze": {
					service: "inboxController",
					description: "Hide a Session until a wake time; a new approval or question wakes it early. A Session already waiting on an approval is refused, as in T3 (`canSnooze`).",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to snooze.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/snooze:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/snooze:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "snoozedUntil",
						description: "future ISO wake time.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/snooze:snoozedUntil",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/snooze:snoozedUntil",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_parameter_1_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/snooze:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_snooze_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 302,
						"column": 9
					}
				},
				"inbox/unsettle": {
					service: "inboxController",
					description: "Return a settled Session to the inbox; the sweep leaves it alone until the user settles it again.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to unsettle.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsettle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsettle:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsettle:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsettle_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 290,
						"column": 9
					}
				},
				"inbox/unsnooze": {
					service: "inboxController",
					description: "Wake a snoozed Session now.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						description: "Session to wake.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsnooze:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsnooze:sessionId",
							create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-t3-inbox#inbox/unsnooze:result",
						create: _deepseek_ai_dsh_experimental_t3_inbox_inbox_unsnooze_result$schema,
						jsonSchemaError: "typert tool schema: unsupported void value"
					},
					sourceLocation: {
						"file": "packages/experimental/t3-inbox/src/index.ts",
						"line": 321,
						"column": 9
					}
				}
			}
		}, zod.z);
		//#endregion
		//#region src/client/actions.ts
		const UNDO_EXPIRY_MS = 5e3;
		/**
		* Build sidebar commands.
		* @param ctx - plugin context owning menus, sessions, and navigation.
		* @param remote - generated `inbox` Remote namespace.
		* @param model - inbox model for optimistic edits.
		* @returns commands, the custom snooze request store, and the undo notice.
		*/
		function createInboxActions(ctx, remote, model) {
			const t = ctx.locale.bind("t3Inbox");
			const customRequest = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			const notice = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			let live = [];
			let expiry;
			ctx.effect(() => () => {
				clearTimeout(expiry);
			}, "t3-inbox: undo expiry");
			const refresh = () => {
				const latest = live.at(-1);
				if (latest === void 0) {
					notice.set(null);
					return;
				}
				const group = [];
				for (const entry of [...live].reverse()) {
					if (entry.action !== latest.action) break;
					group.push(entry);
				}
				notice.set({
					action: latest.action,
					count: group.length,
					undo: () => {
						live = live.filter((entry) => !group.includes(entry));
						refresh();
						for (const entry of group) entry.undo().catch((error) => {
							fail(t("error.undo", { message: String(error) }));
						});
					}
				});
			};
			const showUndo = (action, undo) => {
				live.push({
					action,
					undo
				});
				refresh();
				clearTimeout(expiry);
				expiry = setTimeout(() => {
					live = [];
					refresh();
				}, UNDO_EXPIRY_MS);
			};
			const fail = (message) => {
				ctx.contextMenus.notify(message, false);
			};
			const report = (result, failure) => {
				if (result.ok) return true;
				fail(result.error?.code === "inbox/needs-attention" ? t("error.needsAttention") : t(failure, { message: result.error?.message ?? t("error.unknown") }));
				return false;
			};
			const restore = (sessionId, before) => async () => {
				report(await model.optimistic(sessionId, () => before ?? null, () => remote.restore(sessionId, before ?? null)), "error.undo");
			};
			const now = () => (/* @__PURE__ */ new Date()).toISOString();
			const workspace = () => ctx.get("uiWorkspace");
			const actions = {
				settle: (sessionId) => {
					const before = model.record(sessionId);
					model.optimistic(sessionId, (record) => ({
						settledAt: now(),
						settleReason: "manual",
						unsettledAt: null,
						snoozedUntil: null,
						snoozedAt: null,
						...record?.autoSettleDisabled === true ? { autoSettleDisabled: true } : {}
					}), () => remote.settle(sessionId)).then((result) => {
						if (report(result, "error.settle")) showUndo("settled", restore(sessionId, before));
					});
				},
				unsettle: (sessionId) => {
					model.optimistic(sessionId, (record) => ({
						snoozedUntil: null,
						snoozedAt: null,
						...record,
						settledAt: null,
						settleReason: null,
						unsettledAt: now()
					}), () => remote.unsettle(sessionId)).then((result) => {
						report(result, "error.unsettle");
					});
				},
				snooze: (sessionId, snoozedUntil) => {
					const before = model.record(sessionId);
					model.optimistic(sessionId, (record) => ({
						unsettledAt: null,
						...record,
						settledAt: null,
						settleReason: null,
						snoozedUntil,
						snoozedAt: now()
					}), () => remote.snooze(sessionId, snoozedUntil)).then((result) => {
						if (report(result, "error.snooze")) showUndo("snoozed", restore(sessionId, before));
					});
				},
				unsnooze: (sessionId) => {
					model.optimistic(sessionId, (record) => ({
						settledAt: null,
						settleReason: null,
						unsettledAt: null,
						...record,
						snoozedUntil: null,
						snoozedAt: null
					}), () => remote.unsnooze(sessionId)).then((result) => {
						report(result, "error.wake");
					});
				},
				setAutoSettle: (sessionId, enabled) => {
					model.optimistic(sessionId, (record) => ({
						settledAt: null,
						settleReason: null,
						unsettledAt: null,
						snoozedUntil: null,
						snoozedAt: null,
						...record,
						autoSettleDisabled: !enabled
					}), () => remote.setAutoSettle(sessionId, enabled)).then((result) => {
						report(result, "error.autoSettle");
					});
				},
				pin: (sessionId) => {
					workspace()?.pinSession(sessionId).catch((error) => {
						fail(t("error.pin", { message: String(error) }));
					});
				},
				unpin: (sessionId) => {
					const service = workspace();
					service?.unpinSession(sessionId).then(() => {
						showUndo("unpinned", () => service.pinSession(sessionId));
					}, (error) => {
						fail(t("error.unpin", { message: String(error) }));
					});
				},
				archive: (sessionId) => {
					const service = workspace();
					service?.archiveSession(sessionId).then(() => {
						showUndo("archived", () => service.unarchiveSession(sessionId));
					}, (error) => {
						fail(t("error.archive", { message: String(error) }));
					});
				},
				rename: (sessionId, title) => {
					ctx.sessions.using(sessionId, { source: "t3Inbox" }, (reference) => reference.binding.session.rename(title)).then((result) => {
						if (!result.ok) fail(t("error.rename", { message: result.error.message }));
					}, (error) => {
						fail(t("error.rename", { message: String(error) }));
					});
				},
				open: (sessionId) => {
					workspace()?.openSession(sessionId);
				},
				acknowledgeWoke: (sessionId) => {
					model.markVisited(sessionId);
				},
				newThread: (workspaceId) => {
					workspace()?.startSession(workspaceId);
				},
				addProject: () => {
					const service = workspace();
					const workspaces = ctx.get("workspaces");
					if (service === void 0 || workspaces === void 0) return;
					service.pickDirectory().then(async (path) => {
						if (path === null) return;
						const created = await workspaces.create({ path });
						service.startSession(created.workspaceId);
					}).catch((error) => {
						fail(t("error.addProject", { message: String(error) }));
					});
				},
				requestCustomSnooze: (sessionId) => {
					customRequest.set({ sessionId });
				},
				copy: (text, label) => {
					const named = t(label === "path" ? "copy.label.path" : "copy.label.threadId");
					navigator.clipboard.writeText(text).then(() => {
						ctx.contextMenus.notify(t("toast.copied", { label: named }), true);
					}, () => {
						fail(t("toast.copyFailed", { label: named }));
					});
				},
				fail
			};
			const undoLatest = () => {
				const current = notice.getSnapshot();
				if (current === null) return false;
				current.undo();
				return true;
			};
			return {
				actions,
				customRequest,
				undoNotice: notice,
				undoLatest
			};
		}
		//#endregion
		//#region src/logic.ts
		const MINUTE_MS = 6e4;
		const HOUR_MS = 60 * MINUTE_MS;
		const DAY_MS = 24 * HOUR_MS;
		function parse$1(value) {
			if (value == null) return null;
			const ms = Date.parse(value);
			return Number.isNaN(ms) ? null : ms;
		}
		/**
		* Only a request for the user ends a snooze early. Completed runs never do: a snoozed
		* long-running Session keeps working in the background and stays hidden until its timer.
		* Snoozing an existing question means "ask me later"; only a newer question wakes it.
		* @param record - stored inbox overlay.
		* @param facts - live Session facts.
		* @returns whether the Session demands attention despite its snooze.
		*/
		function raisedHandWhileSnoozed(record, facts) {
			if (facts.approval) return true;
			const snoozedAt = parse$1(record.snoozedAt);
			return facts.question && (snoozedAt === null || facts.questionAt === null || !(facts.questionAt <= snoozedAt));
		}
		/** Snoozed while the wake time is in the future and no hand is raised; malformed data never hides. */
		function effectiveSnoozed(record, facts, nowMs) {
			const wakeAt = parse$1(record.snoozedUntil);
			if (wakeAt === null || wakeAt <= nowMs) return false;
			return !raisedHandWhileSnoozed(record, facts);
		}
		/**
		* When a snoozed Session woke, or null while still snoozed or never snoozed. An early
		* hand-raise wake stays authoritative after the scheduled time passes.
		* @returns epoch milliseconds of the wake.
		*/
		function wokeAt(record, facts, nowMs) {
			const wakeAt = parse$1(record.snoozedUntil);
			if (wakeAt === null) return null;
			if (raisedHandWhileSnoozed(record, facts)) {
				const snoozedAt = parse$1(record.snoozedAt);
				if (facts.questionAt !== null && snoozedAt !== null && facts.questionAt > snoozedAt) return facts.questionAt;
				return facts.updatedAt > 0 ? facts.updatedAt : snoozedAt;
			}
			return wakeAt <= nowMs ? wakeAt : null;
		}
		/**
		* A woke Session shows "Woke" until the user sees it after the wake. A run that
		* finished after the last visit counts as seeing it (T3 `isThreadWokeUnseen`).
		*/
		function isWokeUnseen(input) {
			if (input.wokeAt === null || input.settled) return false;
			return input.lastVisitedAt === null || input.lastVisitedAt < input.wokeAt;
		}
		/** Snoozing is refused only while an approval waits; a question may be snoozed ("ask me later"). */
		function canSnooze(facts) {
			return !facts.approval;
		}
		/** T3 `DEFAULT_SNOOZE_PRESETS`. */
		const DEFAULT_SNOOZE_PRESETS = [
			{
				kind: "after",
				minutes: 60
			},
			{
				kind: "after",
				minutes: 180
			},
			{
				kind: "at",
				day: "today",
				time: "18:00"
			},
			{
				kind: "at",
				day: "tomorrow",
				time: "09:00"
			},
			{
				kind: "at",
				day: "monday",
				time: "09:00"
			}
		];
		function addDays(base, days) {
			const next = new Date(base.getTime());
			next.setDate(next.getDate() + days);
			return next;
		}
		function snoozeDuration(minutes) {
			if (minutes % 1440 === 0) return {
				unit: "day",
				value: minutes / 1440
			};
			if (minutes % 60 === 0) return {
				unit: "hour",
				value: minutes / 60
			};
			return {
				unit: "minute",
				value: minutes
			};
		}
		function daysAhead(setting, now) {
			if (setting.day === "today") return 0;
			if (setting.day === "tomorrow") return 1;
			return (1 - now.getDay() + 7) % 7 || 7;
		}
		function presetName(setting, ahead) {
			if (setting.kind === "after") return {
				kind: "after",
				amount: snoozeDuration(setting.minutes)
			};
			if (ahead === 0) {
				const hour = Number(setting.time.slice(0, 2));
				return { kind: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening" };
			}
			return { kind: ahead === 1 ? "tomorrow" : "nextWeek" };
		}
		function presetId(setting) {
			return setting.kind === "after" ? `after:${setting.minutes}` : `at:${setting.day}:${setting.time}`;
		}
		/** Resolve one setting; a today option whose time has passed is left out until tomorrow. */
		function resolveSnoozePreset(setting, now) {
			let wake;
			let ahead = 0;
			if (setting.kind === "after") wake = new Date(now.getTime() + setting.minutes * MINUTE_MS);
			else {
				ahead = daysAhead(setting, now);
				wake = addDays(now, ahead);
				wake.setHours(Number(setting.time.slice(0, 2)), Number(setting.time.slice(3)), 0, 0);
				if (wake.getTime() <= now.getTime()) return null;
			}
			const name = presetName(setting, ahead);
			const labelNamesDay = setting.kind === "at" && name.kind !== "nextWeek";
			return {
				id: presetId(setting),
				name,
				showsDay: !(labelNamesDay || wake.toDateString() === now.toDateString()),
				wakeAt: wake,
				snoozedUntil: wake.toISOString()
			};
		}
		/** The snooze menu: soonest first, one row per wake minute. */
		function resolveSnoozePresets(now, presets = DEFAULT_SNOOZE_PRESETS) {
			const wakeMinute = (preset) => Math.floor(Date.parse(preset.snoozedUntil) / MINUTE_MS);
			const seen = /* @__PURE__ */ new Set();
			return presets.flatMap((setting) => resolveSnoozePreset(setting, now) ?? []).sort((left, right) => wakeMinute(left) - wakeMinute(right)).filter((preset) => {
				if (seen.has(wakeMinute(preset))) return false;
				seen.add(wakeMinute(preset));
				return true;
			});
		}
		/**
		* A menu choice as picked. A duration re-resolves from its setting so it starts at
		* selection; a set time keeps the shown wake. Null when the shown time has passed.
		*/
		function pickSnoozePreset(shown, id, now) {
			const preset = shown.find((candidate) => candidate.id === id);
			if (preset === void 0) return null;
			if (id.startsWith("after:")) return resolveSnoozePreset({
				kind: "after",
				minutes: Number(id.slice(6))
			}, now);
			return Date.parse(preset.snoozedUntil) > now.getTime() ? preset : null;
		}
		/** Time until a snoozed Session wakes: minutes round up so a hidden row never reads "0m". */
		function snoozeWakeIn(snoozedUntil, nowMs) {
			const wake = parse$1(snoozedUntil);
			if (wake === null) return { unit: "now" };
			const remaining = wake - nowMs;
			if (remaining <= 0) return { unit: "now" };
			if (remaining < HOUR_MS) return {
				unit: "minute",
				value: Math.max(1, Math.ceil(remaining / MINUTE_MS))
			};
			if (remaining < DAY_MS) return {
				unit: "hour",
				value: Math.ceil(remaining / HOUR_MS)
			};
			return {
				unit: "day",
				value: Math.ceil(remaining / DAY_MS)
			};
		}
		/** T3 `formatWorkingDurationLabel` as parts: 42s, 29m, or 1h 5m. */
		function workingDurationParts(elapsedMs) {
			const seconds = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs / 1e3)) : 0;
			if (seconds < 60) return [{
				unit: "second",
				value: seconds
			}];
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return [{
				unit: "minute",
				value: minutes
			}];
			return [{
				unit: "hour",
				value: Math.floor(minutes / 60)
			}, {
				unit: "minute",
				value: minutes % 60
			}];
		}
		/** T3 compact sidebar relative time: now, 5m, 3h, 2d. */
		function compactRelativeTime(atMs, nowMs) {
			const seconds = Math.floor((nowMs - atMs) / 1e3);
			if (seconds < 60) return { unit: "now" };
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return {
				unit: "minute",
				value: minutes
			};
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return {
				unit: "hour",
				value: hours
			};
			return {
				unit: "day",
				value: Math.floor(hours / 24)
			};
		}
		/** Local `YYYY-MM-DD` of a date. */
		function localSnoozeDate(date) {
			return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		}
		/** Local `HH:MM` of a date. */
		function localSnoozeTime(date) {
			return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
		}
		/** Resolve local calendar input or elapsed time, rejecting past, invalid, and DST-nonexistent times. */
		function resolveCustomSnooze(input, now) {
			let wake;
			if (input.mode === "duration") {
				const amount = Number(input.amount);
				if (!Number.isFinite(amount) || amount <= 0) return null;
				const unitMs = {
					minutes: MINUTE_MS,
					hours: HOUR_MS,
					days: DAY_MS
				}[input.unit];
				wake = new Date(now.getTime() + amount * unitMs);
			} else {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return null;
				wake = /* @__PURE__ */ new Date(`${input.date}T${input.time}:00`);
				if (localSnoozeDate(wake) !== input.date || localSnoozeTime(wake) !== input.time) return null;
			}
			return Number.isFinite(wake.getTime()) && wake.getTime() > now.getTime() ? wake.toISOString() : null;
		}
		//#endregion
		//#region \0dsh-css:<dsh>\packages\experimental\t3-inbox\src\client\CustomSnoozeDialog.module.css.mjs
		const css$1 = "._6JxYIa_dialog{max-width:384px}._6JxYIa_form{flex-direction:column;gap:16px;display:flex}._6JxYIa_fields{grid-template-columns:1fr 1fr;gap:12px;display:grid}._6JxYIa_field{min-width:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:8px;font-size:14px;font-weight:500;display:flex}._6JxYIa_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);height:32px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:0 10px;font-weight:400}._6JxYIa_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:14px}._6JxYIa_footer{justify-content:flex-end;gap:8px;display:flex}";
		const tagId$1 = "@deepseek-ai/dsh-experimental-t3-inbox/CustomSnoozeDialog.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-experimental-t3-inbox";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var CustomSnoozeDialog_module_css_default = {
			"dialog": "_6JxYIa_dialog",
			"error": "_6JxYIa_error",
			"field": "_6JxYIa_field",
			"fields": "_6JxYIa_fields",
			"footer": "_6JxYIa_footer",
			"form": "_6JxYIa_form",
			"input": "_6JxYIa_input"
		};
		//#endregion
		//#region src/client/CustomSnoozeDialog.tsx
		/**
		* Custom snooze dialog: a local date and time, or a duration.
		*
		* Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
		* `apps/web/src/components/CustomSnoozeDialog.tsx`. Base UI Dialog, ToggleGroup,
		* Calendar, NumberField, and Select become the dsh Modal, SegmentedControl, and native
		* date, time, number, and select inputs; see PORTING.md.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
		*/
		function Form({ request, dismiss, snooze, t }) {
			const id = (0, react.useId)();
			const [initial] = (0, react.useState)(() => new Date(Date.now() + 36e5));
			const [mode, setMode] = (0, react.useState)("date");
			const [date, setDate] = (0, react.useState)(localSnoozeDate(initial));
			const [time, setTime] = (0, react.useState)(localSnoozeTime(initial));
			const [amount, setAmount] = (0, react.useState)("2");
			const [unit, setUnit] = (0, react.useState)("hours");
			const [error, setError] = (0, react.useState)(null);
			const submit = (event) => {
				event.preventDefault();
				const snoozedUntil = resolveCustomSnooze(mode === "date" ? {
					mode,
					date,
					time
				} : {
					mode,
					amount,
					unit
				}, /* @__PURE__ */ new Date());
				if (snoozedUntil === null) {
					setError(mode === "date" ? t("custom.errorDate") : t("custom.errorDuration"));
					return;
				}
				snooze(request.sessionId, snoozedUntil);
				dismiss();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: dismiss,
				title: t("custom.title"),
				closeLabel: t("custom.close"),
				description: t("custom.description"),
				className: CustomSnoozeDialog_module_css_default.dialog ?? "",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: CustomSnoozeDialog_module_css_default.footer,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						onClick: dismiss,
						children: t("custom.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						size: "sm",
						type: "submit",
						form: `${id}-form`,
						children: t("custom.submit")
					})]
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					id: `${id}-form`,
					className: CustomSnoozeDialog_module_css_default.form,
					onSubmit: submit,
					"data-testid": "t3-inbox-custom-snooze",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: `${id}-mode`,
							label: t("custom.scheduleType"),
							value: mode,
							options: [{
								value: "date",
								label: t("custom.modeDate")
							}, {
								value: "duration",
								label: t("custom.modeDuration")
							}],
							onChange: (next) => {
								setMode(next);
								setError(null);
							}
						}),
						mode === "date" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CustomSnoozeDialog_module_css_default.fields,
							id: `${id}-mode-date-panel`,
							role: "tabpanel",
							"aria-labelledby": `${id}-mode-date`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: CustomSnoozeDialog_module_css_default.field,
								children: [t("custom.date"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: CustomSnoozeDialog_module_css_default.input,
									type: "date",
									required: true,
									value: date,
									min: localSnoozeDate(/* @__PURE__ */ new Date()),
									"data-modal-autofocus": true,
									onChange: (event) => {
										setDate(event.target.value);
										setError(null);
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: CustomSnoozeDialog_module_css_default.field,
								children: [t("custom.time"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: CustomSnoozeDialog_module_css_default.input,
									type: "time",
									required: true,
									value: time,
									onChange: (event) => {
										setTime(event.target.value);
										setError(null);
									}
								})]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CustomSnoozeDialog_module_css_default.fields,
							id: `${id}-mode-duration-panel`,
							role: "tabpanel",
							"aria-labelledby": `${id}-mode-duration`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: CustomSnoozeDialog_module_css_default.field,
								children: [t("custom.amount"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: CustomSnoozeDialog_module_css_default.input,
									type: "number",
									min: "0",
									step: "any",
									required: true,
									value: amount,
									"data-modal-autofocus": true,
									onChange: (event) => {
										setAmount(event.target.value);
										setError(null);
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: CustomSnoozeDialog_module_css_default.field,
								children: [t("custom.unit"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: CustomSnoozeDialog_module_css_default.input,
									value: unit,
									onChange: (event) => {
										setUnit(event.target.value);
										setError(null);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "minutes",
											children: t("custom.unit.minutes")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "hours",
											children: t("custom.unit.hours")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "days",
											children: t("custom.unit.days")
										})
									]
								})]
							})]
						}),
						error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: CustomSnoozeDialog_module_css_default.error,
							role: "alert",
							children: error
						})
					]
				})
			});
		}
		/**
		* Render the dialog while a request is pending; keyed by Session so a new request starts fresh.
		* @param props - overlay share and the injected request.
		* @returns the dialog or null.
		*/
		function CustomSnoozeDialog({ t, useRequest, dismiss, snooze }) {
			const request = useRequest((value) => value);
			if (request === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Form, {
				request,
				dismiss,
				snooze,
				t
			}, request.sessionId);
		}
		//#endregion
		//#region src/client/format.ts
		/**
		* One amount in the active language's narrow unit form (`29m`, `29分钟`).
		* @param amount - value and unit.
		* @param t - namespace translator, for its `time.locale`.
		* @returns the formatted amount.
		*/
		function formatAmount(amount, t) {
			return new Intl.NumberFormat(t("time.locale"), {
				style: "unit",
				unit: amount.unit,
				unitDisplay: "narrow"
			}).format(amount.value);
		}
		/**
		* A relative time, or "now".
		* @param time - amount or the moment itself.
		* @param t - namespace translator.
		* @returns the label.
		*/
		function formatRelative(time, t) {
			return time.unit === "now" ? t("time.now") : formatAmount(time, t);
		}
		/**
		* Several amounts, largest first (`1h 5m`).
		* @param parts - amounts in display order.
		* @param t - namespace translator.
		* @returns the joined label.
		*/
		function formatParts(parts, t) {
			return parts.map((part) => formatAmount(part, t)).join(" ");
		}
		const PRESET_KEYS = {
			morning: "snooze.morning",
			afternoon: "snooze.afternoon",
			evening: "snooze.evening",
			tomorrow: "snooze.tomorrow",
			nextWeek: "snooze.nextWeek"
		};
		/**
		* The name of a snooze preset ("In 1 hour", "Tomorrow").
		* @param preset - resolved preset.
		* @param t - namespace translator.
		* @returns the label.
		*/
		function presetLabel(preset, t) {
			const { name } = preset;
			if (name.kind !== "after") return t(PRESET_KEYS[name.kind]);
			const { unit, value } = name.amount;
			return t(`snooze.in.${unit === "day" ? "day" : unit === "hour" ? "hour" : "minute"}.${value === 1 ? "one" : "other"}`, { count: value });
		}
		/**
		* The wake time next to a preset name: the clock time, with the weekday when the name omits it.
		* @param preset - resolved preset.
		* @param t - namespace translator.
		* @returns the label.
		*/
		function presetWhen(preset, t) {
			const locale = t("time.locale");
			const time = preset.wakeAt.toLocaleTimeString(locale, {
				hour: "numeric",
				minute: "2-digit"
			});
			return preset.showsDay ? `${preset.wakeAt.toLocaleDateString(locale, { weekday: "short" })} ${time}` : time;
		}
		/**
		* The undo notice text: "Settled" for one, "Settled 2" for a group.
		* @param action - what was done.
		* @param count - how many entries the notice groups.
		* @param t - namespace translator.
		* @returns the label.
		*/
		function undoSummary(action, count, t) {
			return t(`undo.${action}.${count === 1 ? "one" : "other"}`, { count });
		}
		//#endregion
		//#region src/client/menu.ts
		/** Context-menu icon keys this plugin renders. */
		const ICON_KEYS = {
			pin: "t3-inbox.pin",
			unpin: "t3-inbox.unpin",
			settle: "t3-inbox.circle-check",
			snooze: "t3-inbox.clock",
			rename: "t3-inbox.pencil",
			filter: "t3-inbox.folder-tree",
			autoSettle: "t3-inbox.timer",
			copy: "t3-inbox.copy",
			path: "t3-inbox.folder",
			hash: "t3-inbox.hash",
			archive: "t3-inbox.archive",
			check: "t3-inbox.check"
		};
		/**
		* Register the row menu. Actions re-resolve while the menu is open, so a row that
		* starts running or blocks updates in place.
		* @param ctx - plugin context owning the menu registry.
		* @param model - inbox model.
		* @param actions - sidebar commands.
		* @param renaming - inline rename request store.
		*/
		function registerThreadMenu(ctx, model, actions, renaming) {
			const t = ctx.locale.bind("t3Inbox");
			ctx.effect(() => ctx.contextMenus.register({
				id: "t3-inbox.thread",
				target: "t3Thread",
				order: 100,
				observe: () => [model.view, model.prefs],
				resolve: ({ sessionId }) => {
					const row = model.view.getSnapshot().byId.get(sessionId);
					if (row === void 0) return [];
					const presets = resolveSnoozePresets(/* @__PURE__ */ new Date());
					const scoped = model.prefs.getSnapshot().scope;
					const filterActive = row.projectId !== null && scoped.length === 1 && scoped[0] === row.projectId;
					return [
						row.pinned ? {
							id: "unpin",
							label: t("action.unpin"),
							icon: { key: ICON_KEYS.unpin },
							run: () => {
								actions.unpin(sessionId);
							}
						} : {
							id: "pin",
							label: t("action.pin"),
							icon: { key: ICON_KEYS.pin },
							run: () => {
								actions.pin(sessionId);
							}
						},
						row.section === "settled" ? {
							id: "unsettle",
							label: t("action.unsettle"),
							icon: { key: ICON_KEYS.settle },
							run: () => {
								actions.unsettle(sessionId);
							}
						} : {
							id: "settle",
							label: t("action.settle"),
							icon: { key: ICON_KEYS.settle },
							run: () => {
								actions.settle(sessionId);
							}
						},
						row.section === "snoozed" ? {
							id: "unsnooze",
							label: t("menu.wake"),
							icon: { key: ICON_KEYS.snooze },
							run: () => {
								actions.unsnooze(sessionId);
							}
						} : {
							id: "snooze",
							label: t("menu.snooze"),
							icon: { key: ICON_KEYS.snooze },
							disabled: !canSnooze(row),
							children: [...presets.map((preset) => ({
								id: `snooze:${preset.id}`,
								label: `${presetLabel(preset, t)} (${presetWhen(preset, t)})`,
								run: () => {
									const picked = pickSnoozePreset(presets, preset.id, /* @__PURE__ */ new Date());
									if (picked === null) actions.fail(t("snooze.passed"));
									else actions.snooze(sessionId, picked.snoozedUntil);
								}
							})), {
								id: "snooze:custom",
								label: t("snooze.custom"),
								separatorBefore: presets.length > 0,
								run: () => {
									actions.requestCustomSnooze(sessionId);
								}
							}]
						},
						{
							id: "rename",
							label: t("action.rename"),
							icon: { key: ICON_KEYS.rename },
							separatorBefore: true,
							run: () => {
								renaming.set({
									sessionId,
									title: row.title
								});
							}
						},
						...row.projectId === null ? [] : [{ projectId: row.projectId }].map(({ projectId }) => ({
							id: "filter-by-project",
							label: filterActive ? t("menu.showAllProjects") : t("menu.filterBy", { project: row.projectName ?? "" }),
							icon: { key: ICON_KEYS.filter },
							run: () => {
								model.setPrefs({ scope: filterActive ? [] : [projectId] });
							}
						})),
						{
							id: "auto-settle",
							label: t("menu.autoSettle"),
							icon: { key: ICON_KEYS.autoSettle },
							children: [{
								id: "auto-settle:enabled",
								label: t("menu.enabled"),
								...row.autoSettleEnabled ? { icon: { key: ICON_KEYS.check } } : {},
								run: () => {
									actions.setAutoSettle(sessionId, true);
								}
							}, {
								id: "auto-settle:disabled",
								label: t("menu.disabled"),
								...row.autoSettleEnabled ? {} : { icon: { key: ICON_KEYS.check } },
								run: () => {
									actions.setAutoSettle(sessionId, false);
								}
							}]
						},
						{
							id: "copy",
							label: t("menu.copy"),
							icon: { key: ICON_KEYS.copy },
							separatorBefore: true,
							children: [...row.cwd === null ? [] : [row.cwd].map((cwd) => ({
								id: "copy-path",
								label: t("menu.path"),
								icon: { key: ICON_KEYS.path },
								run: () => {
									actions.copy(cwd, "path");
								}
							})), {
								id: "copy-thread-id",
								label: t("menu.threadId"),
								icon: { key: ICON_KEYS.hash },
								run: () => {
									actions.copy(sessionId, "threadId");
								}
							}]
						},
						{
							id: "archive",
							label: t("action.archive"),
							icon: { key: ICON_KEYS.archive },
							disabled: row.running,
							separatorBefore: true,
							run: () => {
								actions.archive(sessionId);
							}
						}
					];
				}
			}), "t3-inbox: thread menu");
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* `t3Inbox` namespace dictionaries: the T3-style thread list, its row menu, the custom
		* snooze dialog, the undo notice, and the related-threads menu.
		*
		* Terms follow the dsh vocabulary (Session 会话, Workspace 工作区, subagent 子智能体) and,
		* for snooze and woke, the community T3 zh-CN client's wording. Settle is 已处理.
		* Relative times ("29 分钟") are formatted with `Intl` from the dictionary's `time.locale`.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "zh-CN",
			"time.now": "刚刚",
			"status.working": "进行中",
			"status.waiting": "等待中",
			"status.approval": "待审批",
			"status.input": "待回答",
			"status.woke": "已唤醒",
			"status.done": "已完成",
			"status.completed": "已完成",
			"shelf.working": "进行中",
			"shelf.snoozed": "已稍后处理",
			"shelf.settled": "已处理",
			"shelf.showMore": "再显示 {count} 项",
			"action.settle": "标记会话为已处理",
			"action.settleShort": "已处理",
			"action.unsettle": "恢复会话",
			"action.snooze": "稍后处理会话",
			"action.wake": "立即唤醒会话",
			"action.pin": "置顶会话",
			"action.unpin": "取消置顶",
			"action.rename": "重命名会话",
			"action.archive": "归档会话",
			"action.dismissWoke": "清除已唤醒提示",
			"menu.snooze": "稍后处理",
			"menu.wake": "唤醒会话",
			"menu.filterBy": "按 {project} 筛选",
			"menu.showAllProjects": "显示全部工作区",
			"menu.autoSettle": "自动标记为已处理",
			"menu.enabled": "启用",
			"menu.disabled": "停用",
			"menu.copy": "复制",
			"menu.path": "路径",
			"menu.threadId": "会话 ID",
			"snooze.in.minute.one": "{count} 分钟后",
			"snooze.in.minute.other": "{count} 分钟后",
			"snooze.in.hour.one": "{count} 小时后",
			"snooze.in.hour.other": "{count} 小时后",
			"snooze.in.day.one": "{count} 天后",
			"snooze.in.day.other": "{count} 天后",
			"snooze.morning": "今天上午",
			"snooze.afternoon": "今天下午",
			"snooze.evening": "今天晚上",
			"snooze.tomorrow": "明天",
			"snooze.nextWeek": "下周",
			"snooze.custom": "自定义…",
			"snooze.passed": "该稍后处理时间已过，请另选时间。",
			"undo.button": "撤销",
			"undo.separator": "，",
			"undo.settled.one": "已处理",
			"undo.settled.other": "已处理 {count} 个",
			"undo.snoozed.one": "已稍后处理",
			"undo.snoozed.other": "已稍后处理 {count} 个",
			"undo.unpinned.one": "已取消置顶",
			"undo.unpinned.other": "已取消置顶 {count} 个",
			"undo.archived.one": "已归档",
			"undo.archived.other": "已归档 {count} 个",
			"error.needsAttention": "请先回答待处理的请求，再稍后处理。",
			"error.unknown": "失败",
			"error.settle": "无法将会话标记为已处理：{message}",
			"error.unsettle": "无法恢复会话：{message}",
			"error.snooze": "无法稍后处理会话：{message}",
			"error.wake": "无法唤醒会话：{message}",
			"error.autoSettle": "无法更改自动处理设置：{message}",
			"error.undo": "无法撤销：{message}",
			"error.pin": "无法置顶会话：{message}",
			"error.unpin": "无法取消置顶：{message}",
			"error.archive": "无法归档会话：{message}",
			"error.rename": "无法重命名会话：{message}",
			"error.addProject": "无法添加工作区：{message}",
			"toast.copied": "已复制{label}",
			"toast.copyFailed": "无法复制{label}",
			"copy.label.path": "路径",
			"copy.label.threadId": "会话 ID",
			"search.placeholder": "搜索",
			"search.aria": "搜索会话",
			"search.clear": "清除会话搜索",
			"search.results": "会话搜索结果",
			"search.empty": "未找到会话",
			"filter.aria": "按工作区筛选会话",
			"filter.ariaActive": "按工作区筛选会话：{projects}",
			"filter.all": "全部工作区",
			"header.addProject": "添加工作区",
			"header.newThread": "新建会话",
			"rail.search": "搜索",
			"empty.none": "还没有会话",
			"empty.project": "{project} 中还没有会话",
			"empty.projects": "这些工作区中还没有会话",
			"thread.new": "新会话",
			"rename.aria": "会话标题",
			"related.trigger": "相关会话",
			"related.parent": "父会话",
			"related.subagents": "子智能体",
			"related.itemAria": "{title} {status}",
			"custom.title": "自定义稍后处理",
			"custom.close": "关闭",
			"custom.description": "选择已稍后处理的会话何时回到收件箱。",
			"custom.cancel": "取消",
			"custom.submit": "稍后处理",
			"custom.scheduleType": "计划类型",
			"custom.modeDate": "日期和时间",
			"custom.modeDuration": "时长",
			"custom.date": "日期",
			"custom.time": "时间",
			"custom.amount": "稍后处理时长",
			"custom.unit": "单位",
			"custom.unit.minutes": "分钟",
			"custom.unit.hours": "小时",
			"custom.unit.days": "天",
			"custom.errorDate": "请选择未来的有效日期和时间。",
			"custom.errorDuration": "请输入大于 0 的时长。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "en",
			"time.now": "now",
			"status.working": "Working",
			"status.waiting": "Waiting",
			"status.approval": "Approval",
			"status.input": "Input",
			"status.woke": "Woke",
			"status.done": "Done",
			"status.completed": "Completed",
			"shelf.working": "Working",
			"shelf.snoozed": "Snoozed",
			"shelf.settled": "Settled",
			"shelf.showMore": "Show {count} more",
			"action.settle": "Settle thread",
			"action.settleShort": "Settle",
			"action.unsettle": "Un-settle thread",
			"action.snooze": "Snooze thread",
			"action.wake": "Wake thread now",
			"action.pin": "Pin thread",
			"action.unpin": "Unpin thread",
			"action.rename": "Rename thread",
			"action.archive": "Archive thread",
			"action.dismissWoke": "Dismiss Woke notification",
			"menu.snooze": "Snooze",
			"menu.wake": "Wake thread",
			"menu.filterBy": "Filter by {project}",
			"menu.showAllProjects": "Show all projects",
			"menu.autoSettle": "Auto-settle behavior",
			"menu.enabled": "Enabled",
			"menu.disabled": "Disabled",
			"menu.copy": "Copy",
			"menu.path": "Path",
			"menu.threadId": "Thread ID",
			"snooze.in.minute.one": "In {count} minute",
			"snooze.in.minute.other": "In {count} minutes",
			"snooze.in.hour.one": "In {count} hour",
			"snooze.in.hour.other": "In {count} hours",
			"snooze.in.day.one": "In {count} day",
			"snooze.in.day.other": "In {count} days",
			"snooze.morning": "This morning",
			"snooze.afternoon": "This afternoon",
			"snooze.evening": "This evening",
			"snooze.tomorrow": "Tomorrow",
			"snooze.nextWeek": "Next week",
			"snooze.custom": "Custom…",
			"snooze.passed": "That snooze time has passed. Choose another time.",
			"undo.button": "Undo",
			"undo.separator": ",",
			"undo.settled.one": "Settled",
			"undo.settled.other": "Settled {count}",
			"undo.snoozed.one": "Snoozed",
			"undo.snoozed.other": "Snoozed {count}",
			"undo.unpinned.one": "Unpinned",
			"undo.unpinned.other": "Unpinned {count}",
			"undo.archived.one": "Archived",
			"undo.archived.other": "Archived {count}",
			"error.needsAttention": "Answer the pending request before snoozing.",
			"error.unknown": "failed",
			"error.settle": "Could not settle thread: {message}",
			"error.unsettle": "Could not un-settle thread: {message}",
			"error.snooze": "Could not snooze thread: {message}",
			"error.wake": "Could not wake thread: {message}",
			"error.autoSettle": "Could not change auto-settle: {message}",
			"error.undo": "Could not undo: {message}",
			"error.pin": "Could not pin thread: {message}",
			"error.unpin": "Could not unpin thread: {message}",
			"error.archive": "Could not archive thread: {message}",
			"error.rename": "Could not rename thread: {message}",
			"error.addProject": "Could not add project: {message}",
			"toast.copied": "Copied {label}",
			"toast.copyFailed": "Could not copy {label}",
			"copy.label.path": "path",
			"copy.label.threadId": "thread ID",
			"search.placeholder": "Search",
			"search.aria": "Search threads",
			"search.clear": "Clear thread search",
			"search.results": "Thread search results",
			"search.empty": "No threads found",
			"filter.aria": "Filter threads by project",
			"filter.ariaActive": "Filter threads by project: {projects}",
			"filter.all": "All projects",
			"header.addProject": "Add project",
			"header.newThread": "New thread",
			"rail.search": "Search",
			"empty.none": "No threads yet",
			"empty.project": "No threads in {project} yet",
			"empty.projects": "No threads in these projects yet",
			"thread.new": "New thread",
			"rename.aria": "Thread title",
			"related.trigger": "Related threads",
			"related.parent": "Parent thread",
			"related.subagents": "Subagents",
			"related.itemAria": "{title} {status}",
			"custom.title": "Custom snooze",
			"custom.close": "Close",
			"custom.description": "Choose when snoozed threads return to your inbox.",
			"custom.cancel": "Cancel",
			"custom.submit": "Snooze",
			"custom.scheduleType": "Schedule type",
			"custom.modeDate": "Date and time",
			"custom.modeDuration": "Duration",
			"custom.date": "Date",
			"custom.time": "Time",
			"custom.amount": "Snooze for",
			"custom.unit": "Unit",
			"custom.unit.minutes": "Minutes",
			"custom.unit.hours": "Hours",
			"custom.unit.days": "Days",
			"custom.errorDate": "Choose a valid date and time in the future.",
			"custom.errorDuration": "Enter a positive duration."
		};
		/** Japanese copy, checked against the English keys. */
		const ja = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "ja-JP",
			"time.now": "たった今",
			"status.working": "実行中",
			"status.waiting": "待機中",
			"status.approval": "承認待ち",
			"status.input": "回答待ち",
			"status.woke": "再開",
			"status.done": "完了",
			"status.completed": "完了",
			"shelf.working": "実行中",
			"shelf.snoozed": "スヌーズ中",
			"shelf.settled": "整理済み",
			"shelf.showMore": "さらに {count} 件を表示",
			"action.settle": "セッションを整理済みにする",
			"action.settleShort": "整理",
			"action.unsettle": "整理済みを解除",
			"action.snooze": "セッションをスヌーズ",
			"action.wake": "セッションを今すぐ再開",
			"action.pin": "セッションを固定",
			"action.unpin": "固定を解除",
			"action.rename": "セッション名を変更",
			"action.archive": "セッションをアーカイブ",
			"action.dismissWoke": "再開通知を消す",
			"menu.snooze": "スヌーズ",
			"menu.wake": "セッションを再開",
			"menu.filterBy": "{project} で絞り込む",
			"menu.showAllProjects": "すべてのワークスペースを表示",
			"menu.autoSettle": "自動整理の動作",
			"menu.enabled": "有効",
			"menu.disabled": "無効",
			"menu.copy": "コピー",
			"menu.path": "パス",
			"menu.threadId": "セッション ID",
			"snooze.in.minute.one": "{count} 分後",
			"snooze.in.minute.other": "{count} 分後",
			"snooze.in.hour.one": "{count} 時間後",
			"snooze.in.hour.other": "{count} 時間後",
			"snooze.in.day.one": "{count} 日後",
			"snooze.in.day.other": "{count} 日後",
			"snooze.morning": "今日の午前",
			"snooze.afternoon": "今日の午後",
			"snooze.evening": "今日の夜",
			"snooze.tomorrow": "明日",
			"snooze.nextWeek": "来週",
			"snooze.custom": "カスタム…",
			"snooze.passed": "そのスヌーズ時刻は過ぎています。別の時刻を選んでください。",
			"undo.button": "元に戻す",
			"undo.separator": "、",
			"undo.settled.one": "整理済みにしました",
			"undo.settled.other": "{count} 件を整理済みにしました",
			"undo.snoozed.one": "スヌーズしました",
			"undo.snoozed.other": "{count} 件をスヌーズしました",
			"undo.unpinned.one": "固定を解除しました",
			"undo.unpinned.other": "{count} 件の固定を解除しました",
			"undo.archived.one": "アーカイブしました",
			"undo.archived.other": "{count} 件をアーカイブしました",
			"error.needsAttention": "保留中のリクエストに応答してからスヌーズしてください。",
			"error.unknown": "失敗しました",
			"error.settle": "セッションを整理済みにできませんでした: {message}",
			"error.unsettle": "整理済みを解除できませんでした: {message}",
			"error.snooze": "セッションをスヌーズできませんでした: {message}",
			"error.wake": "セッションを再開できませんでした: {message}",
			"error.autoSettle": "自動整理を変更できませんでした: {message}",
			"error.undo": "元に戻せませんでした: {message}",
			"error.pin": "セッションを固定できませんでした: {message}",
			"error.unpin": "固定を解除できませんでした: {message}",
			"error.archive": "セッションをアーカイブできませんでした: {message}",
			"error.rename": "セッション名を変更できませんでした: {message}",
			"error.addProject": "ワークスペースを追加できませんでした: {message}",
			"toast.copied": "{label}をコピーしました",
			"toast.copyFailed": "{label}をコピーできませんでした",
			"copy.label.path": "パス",
			"copy.label.threadId": "セッション ID",
			"search.placeholder": "検索",
			"search.aria": "セッションを検索",
			"search.clear": "セッション検索をクリア",
			"search.results": "セッションの検索結果",
			"search.empty": "セッションが見つかりません",
			"filter.aria": "ワークスペースでセッションを絞り込む",
			"filter.ariaActive": "ワークスペースでセッションを絞り込む: {projects}",
			"filter.all": "すべてのワークスペース",
			"header.addProject": "ワークスペースを追加",
			"header.newThread": "新しいセッション",
			"rail.search": "検索",
			"empty.none": "セッションはまだありません",
			"empty.project": "{project} にセッションはまだありません",
			"empty.projects": "これらのワークスペースにセッションはまだありません",
			"thread.new": "新しいセッション",
			"rename.aria": "セッション名",
			"related.trigger": "関連セッション",
			"related.parent": "親セッション",
			"related.subagents": "サブエージェント",
			"related.itemAria": "{title} {status}",
			"custom.title": "カスタムスヌーズ",
			"custom.close": "閉じる",
			"custom.description": "スヌーズしたセッションを受信トレイに戻す時刻を選びます。",
			"custom.cancel": "キャンセル",
			"custom.submit": "スヌーズ",
			"custom.scheduleType": "スケジュールの種類",
			"custom.modeDate": "日付と時刻",
			"custom.modeDuration": "期間",
			"custom.date": "日付",
			"custom.time": "時刻",
			"custom.amount": "スヌーズする期間",
			"custom.unit": "単位",
			"custom.unit.minutes": "分",
			"custom.unit.hours": "時間",
			"custom.unit.days": "日",
			"custom.errorDate": "未来の有効な日付と時刻を選んでください。",
			"custom.errorDuration": "0 より大きい期間を入力してください。"
		};
		/** Spanish copy, checked against the English keys. */
		const es = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "es",
			"time.now": "ahora",
			"status.working": "En curso",
			"status.waiting": "Esperando",
			"status.approval": "Aprobación",
			"status.input": "Respuesta",
			"status.woke": "Reactivada",
			"status.done": "Listo",
			"status.completed": "Completada",
			"shelf.working": "En curso",
			"shelf.snoozed": "Pospuestas",
			"shelf.settled": "Resueltas",
			"shelf.showMore": "Mostrar {count} más",
			"action.settle": "Marcar sesión como resuelta",
			"action.settleShort": "Resolver",
			"action.unsettle": "Reabrir sesión",
			"action.snooze": "Posponer sesión",
			"action.wake": "Reactivar sesión ahora",
			"action.pin": "Fijar sesión",
			"action.unpin": "Desfijar sesión",
			"action.rename": "Renombrar sesión",
			"action.archive": "Archivar sesión",
			"action.dismissWoke": "Descartar aviso de reactivación",
			"menu.snooze": "Posponer",
			"menu.wake": "Reactivar sesión",
			"menu.filterBy": "Filtrar por {project}",
			"menu.showAllProjects": "Mostrar todos los espacios de trabajo",
			"menu.autoSettle": "Resolución automática",
			"menu.enabled": "Activada",
			"menu.disabled": "Desactivada",
			"menu.copy": "Copiar",
			"menu.path": "Ruta",
			"menu.threadId": "ID de sesión",
			"snooze.in.minute.one": "En {count} minuto",
			"snooze.in.minute.other": "En {count} minutos",
			"snooze.in.hour.one": "En {count} hora",
			"snooze.in.hour.other": "En {count} horas",
			"snooze.in.day.one": "En {count} día",
			"snooze.in.day.other": "En {count} días",
			"snooze.morning": "Esta mañana",
			"snooze.afternoon": "Esta tarde",
			"snooze.evening": "Esta noche",
			"snooze.tomorrow": "Mañana",
			"snooze.nextWeek": "La semana próxima",
			"snooze.custom": "Personalizado…",
			"snooze.passed": "Esa hora ya pasó. Elige otra.",
			"undo.button": "Deshacer",
			"undo.separator": ",",
			"undo.settled.one": "Resuelta",
			"undo.settled.other": "Resueltas {count}",
			"undo.snoozed.one": "Pospuesta",
			"undo.snoozed.other": "Pospuestas {count}",
			"undo.unpinned.one": "Desfijada",
			"undo.unpinned.other": "Desfijadas {count}",
			"undo.archived.one": "Archivada",
			"undo.archived.other": "Archivadas {count}",
			"error.needsAttention": "Responde a la solicitud pendiente antes de posponer.",
			"error.unknown": "error",
			"error.settle": "No se pudo resolver la sesión: {message}",
			"error.unsettle": "No se pudo reabrir la sesión: {message}",
			"error.snooze": "No se pudo posponer la sesión: {message}",
			"error.wake": "No se pudo reactivar la sesión: {message}",
			"error.autoSettle": "No se pudo cambiar la resolución automática: {message}",
			"error.undo": "No se pudo deshacer: {message}",
			"error.pin": "No se pudo fijar la sesión: {message}",
			"error.unpin": "No se pudo desfijar la sesión: {message}",
			"error.archive": "No se pudo archivar la sesión: {message}",
			"error.rename": "No se pudo renombrar la sesión: {message}",
			"error.addProject": "No se pudo añadir el espacio de trabajo: {message}",
			"toast.copied": "{label} copiado",
			"toast.copyFailed": "No se pudo copiar: {label}",
			"copy.label.path": "ruta",
			"copy.label.threadId": "ID de sesión",
			"search.placeholder": "Buscar",
			"search.aria": "Buscar sesiones",
			"search.clear": "Borrar búsqueda de sesiones",
			"search.results": "Resultados de búsqueda de sesiones",
			"search.empty": "No se encontraron sesiones",
			"filter.aria": "Filtrar sesiones por espacio de trabajo",
			"filter.ariaActive": "Filtrar sesiones por espacio de trabajo: {projects}",
			"filter.all": "Todos los espacios de trabajo",
			"header.addProject": "Añadir espacio de trabajo",
			"header.newThread": "Nueva sesión",
			"rail.search": "Buscar",
			"empty.none": "Aún no hay sesiones",
			"empty.project": "Aún no hay sesiones en {project}",
			"empty.projects": "Aún no hay sesiones en estos espacios de trabajo",
			"thread.new": "Nueva sesión",
			"rename.aria": "Título de la sesión",
			"related.trigger": "Sesiones relacionadas",
			"related.parent": "Sesión principal",
			"related.subagents": "Subagentes",
			"related.itemAria": "{title} {status}",
			"custom.title": "Posponer a medida",
			"custom.close": "Cerrar",
			"custom.description": "Elige cuándo vuelven a tu bandeja las sesiones pospuestas.",
			"custom.cancel": "Cancelar",
			"custom.submit": "Posponer",
			"custom.scheduleType": "Tipo de programación",
			"custom.modeDate": "Fecha y hora",
			"custom.modeDuration": "Duración",
			"custom.date": "Fecha",
			"custom.time": "Hora",
			"custom.amount": "Posponer durante",
			"custom.unit": "Unidad",
			"custom.unit.minutes": "Minutos",
			"custom.unit.hours": "Horas",
			"custom.unit.days": "Días",
			"custom.errorDate": "Elige una fecha y hora válidas en el futuro.",
			"custom.errorDuration": "Introduce una duración positiva."
		};
		/** French copy, checked against the English keys. */
		const fr = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "fr",
			"time.now": "à l’instant",
			"status.working": "En cours",
			"status.waiting": "En attente",
			"status.approval": "Approbation",
			"status.input": "Réponse",
			"status.woke": "Réveillée",
			"status.done": "Terminée",
			"status.completed": "Terminée",
			"shelf.working": "En cours",
			"shelf.snoozed": "Reportées",
			"shelf.settled": "Réglées",
			"shelf.showMore": "Afficher {count} de plus",
			"action.settle": "Marquer la session comme réglée",
			"action.settleShort": "Régler",
			"action.unsettle": "Rouvrir la session",
			"action.snooze": "Reporter la session",
			"action.wake": "Réveiller la session maintenant",
			"action.pin": "Épingler la session",
			"action.unpin": "Désépingler la session",
			"action.rename": "Renommer la session",
			"action.archive": "Archiver la session",
			"action.dismissWoke": "Ignorer la notification de réveil",
			"menu.snooze": "Reporter",
			"menu.wake": "Réveiller la session",
			"menu.filterBy": "Filtrer par {project}",
			"menu.showAllProjects": "Afficher tous les espaces de travail",
			"menu.autoSettle": "Règlement automatique",
			"menu.enabled": "Activé",
			"menu.disabled": "Désactivé",
			"menu.copy": "Copier",
			"menu.path": "Chemin",
			"menu.threadId": "ID de session",
			"snooze.in.minute.one": "Dans {count} minute",
			"snooze.in.minute.other": "Dans {count} minutes",
			"snooze.in.hour.one": "Dans {count} heure",
			"snooze.in.hour.other": "Dans {count} heures",
			"snooze.in.day.one": "Dans {count} jour",
			"snooze.in.day.other": "Dans {count} jours",
			"snooze.morning": "Ce matin",
			"snooze.afternoon": "Cet après-midi",
			"snooze.evening": "Ce soir",
			"snooze.tomorrow": "Demain",
			"snooze.nextWeek": "La semaine prochaine",
			"snooze.custom": "Personnalisé…",
			"snooze.passed": "Cette heure est déjà passée. Choisissez-en une autre.",
			"undo.button": "Annuler",
			"undo.separator": ",",
			"undo.settled.one": "Réglée",
			"undo.settled.other": "Réglées {count}",
			"undo.snoozed.one": "Reportée",
			"undo.snoozed.other": "Reportées {count}",
			"undo.unpinned.one": "Désépinglée",
			"undo.unpinned.other": "Désépinglées {count}",
			"undo.archived.one": "Archivée",
			"undo.archived.other": "Archivées {count}",
			"error.needsAttention": "Répondez à la demande en attente avant de reporter.",
			"error.unknown": "échec",
			"error.settle": "Impossible de régler la session : {message}",
			"error.unsettle": "Impossible de rouvrir la session : {message}",
			"error.snooze": "Impossible de reporter la session : {message}",
			"error.wake": "Impossible de réveiller la session : {message}",
			"error.autoSettle": "Impossible de modifier le règlement automatique : {message}",
			"error.undo": "Impossible d’annuler : {message}",
			"error.pin": "Impossible d’épingler la session : {message}",
			"error.unpin": "Impossible de désépingler la session : {message}",
			"error.archive": "Impossible d’archiver la session : {message}",
			"error.rename": "Impossible de renommer la session : {message}",
			"error.addProject": "Impossible d’ajouter l’espace de travail : {message}",
			"toast.copied": "{label} copié",
			"toast.copyFailed": "Impossible de copier : {label}",
			"copy.label.path": "chemin",
			"copy.label.threadId": "ID de session",
			"search.placeholder": "Rechercher",
			"search.aria": "Rechercher des sessions",
			"search.clear": "Effacer la recherche de sessions",
			"search.results": "Résultats de la recherche de sessions",
			"search.empty": "Aucune session trouvée",
			"filter.aria": "Filtrer les sessions par espace de travail",
			"filter.ariaActive": "Filtrer les sessions par espace de travail : {projects}",
			"filter.all": "Tous les espaces de travail",
			"header.addProject": "Ajouter un espace de travail",
			"header.newThread": "Nouvelle session",
			"rail.search": "Rechercher",
			"empty.none": "Aucune session pour l’instant",
			"empty.project": "Aucune session dans {project} pour l’instant",
			"empty.projects": "Aucune session dans ces espaces de travail pour l’instant",
			"thread.new": "Nouvelle session",
			"rename.aria": "Titre de la session",
			"related.trigger": "Sessions liées",
			"related.parent": "Session parente",
			"related.subagents": "Sous-agents",
			"related.itemAria": "{title} {status}",
			"custom.title": "Report personnalisé",
			"custom.close": "Fermer",
			"custom.description": "Choisissez quand les sessions reportées reviennent dans votre boîte de réception.",
			"custom.cancel": "Annuler",
			"custom.submit": "Reporter",
			"custom.scheduleType": "Type de planification",
			"custom.modeDate": "Date et heure",
			"custom.modeDuration": "Durée",
			"custom.date": "Date",
			"custom.time": "Heure",
			"custom.amount": "Reporter de",
			"custom.unit": "Unité",
			"custom.unit.minutes": "Minutes",
			"custom.unit.hours": "Heures",
			"custom.unit.days": "Jours",
			"custom.errorDate": "Choisissez une date et une heure valides dans le futur.",
			"custom.errorDuration": "Saisissez une durée positive."
		};
		/** German copy, checked against the English keys. */
		const de = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "de",
			"time.now": "jetzt",
			"status.working": "Läuft",
			"status.waiting": "Wartet",
			"status.approval": "Freigabe",
			"status.input": "Antwort",
			"status.woke": "Geweckt",
			"status.done": "Fertig",
			"status.completed": "Abgeschlossen",
			"shelf.working": "Läuft",
			"shelf.snoozed": "Zurückgestellt",
			"shelf.settled": "Erledigt",
			"shelf.showMore": "{count} weitere anzeigen",
			"action.settle": "Sitzung als erledigt markieren",
			"action.settleShort": "Erledigen",
			"action.unsettle": "Sitzung wieder öffnen",
			"action.snooze": "Sitzung zurückstellen",
			"action.wake": "Sitzung jetzt wecken",
			"action.pin": "Sitzung anheften",
			"action.unpin": "Sitzung lösen",
			"action.rename": "Sitzung umbenennen",
			"action.archive": "Sitzung archivieren",
			"action.dismissWoke": "Weckhinweis ausblenden",
			"menu.snooze": "Zurückstellen",
			"menu.wake": "Sitzung wecken",
			"menu.filterBy": "Nach {project} filtern",
			"menu.showAllProjects": "Alle Arbeitsbereiche anzeigen",
			"menu.autoSettle": "Automatisch erledigen",
			"menu.enabled": "Aktiviert",
			"menu.disabled": "Deaktiviert",
			"menu.copy": "Kopieren",
			"menu.path": "Pfad",
			"menu.threadId": "Sitzungs-ID",
			"snooze.in.minute.one": "In {count} Minute",
			"snooze.in.minute.other": "In {count} Minuten",
			"snooze.in.hour.one": "In {count} Stunde",
			"snooze.in.hour.other": "In {count} Stunden",
			"snooze.in.day.one": "In {count} Tag",
			"snooze.in.day.other": "In {count} Tagen",
			"snooze.morning": "Heute Vormittag",
			"snooze.afternoon": "Heute Nachmittag",
			"snooze.evening": "Heute Abend",
			"snooze.tomorrow": "Morgen",
			"snooze.nextWeek": "Nächste Woche",
			"snooze.custom": "Benutzerdefiniert…",
			"snooze.passed": "Dieser Zeitpunkt ist schon vorbei. Wähle einen anderen.",
			"undo.button": "Rückgängig",
			"undo.separator": ",",
			"undo.settled.one": "Erledigt",
			"undo.settled.other": "{count} erledigt",
			"undo.snoozed.one": "Zurückgestellt",
			"undo.snoozed.other": "{count} zurückgestellt",
			"undo.unpinned.one": "Gelöst",
			"undo.unpinned.other": "{count} gelöst",
			"undo.archived.one": "Archiviert",
			"undo.archived.other": "{count} archiviert",
			"error.needsAttention": "Beantworte die offene Anfrage, bevor du zurückstellst.",
			"error.unknown": "fehlgeschlagen",
			"error.settle": "Sitzung konnte nicht erledigt werden: {message}",
			"error.unsettle": "Sitzung konnte nicht wieder geöffnet werden: {message}",
			"error.snooze": "Sitzung konnte nicht zurückgestellt werden: {message}",
			"error.wake": "Sitzung konnte nicht geweckt werden: {message}",
			"error.autoSettle": "Automatisches Erledigen konnte nicht geändert werden: {message}",
			"error.undo": "Rückgängig machen fehlgeschlagen: {message}",
			"error.pin": "Sitzung konnte nicht angeheftet werden: {message}",
			"error.unpin": "Sitzung konnte nicht gelöst werden: {message}",
			"error.archive": "Sitzung konnte nicht archiviert werden: {message}",
			"error.rename": "Sitzung konnte nicht umbenannt werden: {message}",
			"error.addProject": "Arbeitsbereich konnte nicht hinzugefügt werden: {message}",
			"toast.copied": "{label} kopiert",
			"toast.copyFailed": "{label} konnte nicht kopiert werden",
			"copy.label.path": "Pfad",
			"copy.label.threadId": "Sitzungs-ID",
			"search.placeholder": "Suchen",
			"search.aria": "Sitzungen durchsuchen",
			"search.clear": "Sitzungssuche löschen",
			"search.results": "Suchergebnisse für Sitzungen",
			"search.empty": "Keine Sitzungen gefunden",
			"filter.aria": "Sitzungen nach Arbeitsbereich filtern",
			"filter.ariaActive": "Sitzungen nach Arbeitsbereich filtern: {projects}",
			"filter.all": "Alle Arbeitsbereiche",
			"header.addProject": "Arbeitsbereich hinzufügen",
			"header.newThread": "Neue Sitzung",
			"rail.search": "Suchen",
			"empty.none": "Noch keine Sitzungen",
			"empty.project": "Noch keine Sitzungen in {project}",
			"empty.projects": "Noch keine Sitzungen in diesen Arbeitsbereichen",
			"thread.new": "Neue Sitzung",
			"rename.aria": "Sitzungstitel",
			"related.trigger": "Zugehörige Sitzungen",
			"related.parent": "Übergeordnete Sitzung",
			"related.subagents": "Subagenten",
			"related.itemAria": "{title} {status}",
			"custom.title": "Benutzerdefiniert zurückstellen",
			"custom.close": "Schließen",
			"custom.description": "Wähle, wann zurückgestellte Sitzungen wieder im Posteingang erscheinen.",
			"custom.cancel": "Abbrechen",
			"custom.submit": "Zurückstellen",
			"custom.scheduleType": "Zeitplantyp",
			"custom.modeDate": "Datum und Uhrzeit",
			"custom.modeDuration": "Dauer",
			"custom.date": "Datum",
			"custom.time": "Uhrzeit",
			"custom.amount": "Zurückstellen für",
			"custom.unit": "Einheit",
			"custom.unit.minutes": "Minuten",
			"custom.unit.hours": "Stunden",
			"custom.unit.days": "Tage",
			"custom.errorDate": "Wähle ein gültiges Datum mit Uhrzeit in der Zukunft.",
			"custom.errorDuration": "Gib eine positive Dauer ein."
		};
		/** Russian copy, checked against the English keys. */
		const ru = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "ru",
			"time.now": "сейчас",
			"status.working": "Идёт",
			"status.waiting": "Ожидает",
			"status.approval": "Одобрение",
			"status.input": "Ответ",
			"status.woke": "Возобновлена",
			"status.done": "Готово",
			"status.completed": "Завершена",
			"shelf.working": "Идёт",
			"shelf.snoozed": "Отложены",
			"shelf.settled": "Закрыты",
			"shelf.showMore": "Показать ещё {count}",
			"action.settle": "Закрыть сессию",
			"action.settleShort": "Закрыть",
			"action.unsettle": "Вернуть сессию",
			"action.snooze": "Отложить сессию",
			"action.wake": "Возобновить сессию сейчас",
			"action.pin": "Закрепить сессию",
			"action.unpin": "Открепить сессию",
			"action.rename": "Переименовать сессию",
			"action.archive": "Архивировать сессию",
			"action.dismissWoke": "Скрыть уведомление о возобновлении",
			"menu.snooze": "Отложить",
			"menu.wake": "Возобновить сессию",
			"menu.filterBy": "Фильтр: {project}",
			"menu.showAllProjects": "Показать все рабочие области",
			"menu.autoSettle": "Автоматическое закрытие",
			"menu.enabled": "Включено",
			"menu.disabled": "Отключено",
			"menu.copy": "Копировать",
			"menu.path": "Путь",
			"menu.threadId": "ID сессии",
			"snooze.in.minute.one": "Через {count} минуту",
			"snooze.in.minute.other": "Через {count} мин.",
			"snooze.in.hour.one": "Через {count} час",
			"snooze.in.hour.other": "Через {count} ч.",
			"snooze.in.day.one": "Через {count} день",
			"snooze.in.day.other": "Через {count} дн.",
			"snooze.morning": "Сегодня утром",
			"snooze.afternoon": "Сегодня днём",
			"snooze.evening": "Сегодня вечером",
			"snooze.tomorrow": "Завтра",
			"snooze.nextWeek": "На следующей неделе",
			"snooze.custom": "Другое…",
			"snooze.passed": "Это время уже прошло. Выберите другое.",
			"undo.button": "Отменить",
			"undo.separator": ",",
			"undo.settled.one": "Закрыта",
			"undo.settled.other": "Закрыто: {count}",
			"undo.snoozed.one": "Отложена",
			"undo.snoozed.other": "Отложено: {count}",
			"undo.unpinned.one": "Откреплена",
			"undo.unpinned.other": "Откреплено: {count}",
			"undo.archived.one": "Архивирована",
			"undo.archived.other": "Архивировано: {count}",
			"error.needsAttention": "Ответьте на ожидающий запрос, прежде чем откладывать.",
			"error.unknown": "сбой",
			"error.settle": "Не удалось закрыть сессию: {message}",
			"error.unsettle": "Не удалось вернуть сессию: {message}",
			"error.snooze": "Не удалось отложить сессию: {message}",
			"error.wake": "Не удалось возобновить сессию: {message}",
			"error.autoSettle": "Не удалось изменить автоматическое закрытие: {message}",
			"error.undo": "Не удалось отменить: {message}",
			"error.pin": "Не удалось закрепить сессию: {message}",
			"error.unpin": "Не удалось открепить сессию: {message}",
			"error.archive": "Не удалось архивировать сессию: {message}",
			"error.rename": "Не удалось переименовать сессию: {message}",
			"error.addProject": "Не удалось добавить рабочую область: {message}",
			"toast.copied": "Скопировано: {label}",
			"toast.copyFailed": "Не удалось скопировать: {label}",
			"copy.label.path": "путь",
			"copy.label.threadId": "ID сессии",
			"search.placeholder": "Поиск",
			"search.aria": "Поиск сессий",
			"search.clear": "Очистить поиск сессий",
			"search.results": "Результаты поиска сессий",
			"search.empty": "Сессии не найдены",
			"filter.aria": "Фильтр сессий по рабочей области",
			"filter.ariaActive": "Фильтр сессий по рабочей области: {projects}",
			"filter.all": "Все рабочие области",
			"header.addProject": "Добавить рабочую область",
			"header.newThread": "Новая сессия",
			"rail.search": "Поиск",
			"empty.none": "Сессий пока нет",
			"empty.project": "В {project} пока нет сессий",
			"empty.projects": "В этих рабочих областях пока нет сессий",
			"thread.new": "Новая сессия",
			"rename.aria": "Название сессии",
			"related.trigger": "Связанные сессии",
			"related.parent": "Родительская сессия",
			"related.subagents": "Субагенты",
			"related.itemAria": "{title} {status}",
			"custom.title": "Свой срок отсрочки",
			"custom.close": "Закрыть",
			"custom.description": "Выберите, когда отложенные сессии вернутся во входящие.",
			"custom.cancel": "Отмена",
			"custom.submit": "Отложить",
			"custom.scheduleType": "Тип расписания",
			"custom.modeDate": "Дата и время",
			"custom.modeDuration": "Длительность",
			"custom.date": "Дата",
			"custom.time": "Время",
			"custom.amount": "Отложить на",
			"custom.unit": "Единица",
			"custom.unit.minutes": "Минуты",
			"custom.unit.hours": "Часы",
			"custom.unit.days": "Дни",
			"custom.errorDate": "Выберите допустимые дату и время в будущем.",
			"custom.errorDuration": "Введите положительную длительность."
		};
		/** Brazilian Portuguese copy, checked against the English keys. */
		const pt = {
			"brand.mark": "DSH",
			"brand.name": "Harness",
			"time.locale": "pt-BR",
			"time.now": "agora",
			"status.working": "Em curso",
			"status.waiting": "Aguardando",
			"status.approval": "Aprovação",
			"status.input": "Resposta",
			"status.woke": "Reativada",
			"status.done": "Concluída",
			"status.completed": "Concluída",
			"shelf.working": "Em curso",
			"shelf.snoozed": "Adiadas",
			"shelf.settled": "Resolvidas",
			"shelf.showMore": "Mostrar mais {count}",
			"action.settle": "Marcar sessão como resolvida",
			"action.settleShort": "Resolver",
			"action.unsettle": "Reabrir sessão",
			"action.snooze": "Adiar sessão",
			"action.wake": "Reativar sessão agora",
			"action.pin": "Fixar sessão",
			"action.unpin": "Desafixar sessão",
			"action.rename": "Renomear sessão",
			"action.archive": "Arquivar sessão",
			"action.dismissWoke": "Dispensar aviso de reativação",
			"menu.snooze": "Adiar",
			"menu.wake": "Reativar sessão",
			"menu.filterBy": "Filtrar por {project}",
			"menu.showAllProjects": "Mostrar todos os espaços de trabalho",
			"menu.autoSettle": "Resolução automática",
			"menu.enabled": "Ativada",
			"menu.disabled": "Desativada",
			"menu.copy": "Copiar",
			"menu.path": "Caminho",
			"menu.threadId": "ID da sessão",
			"snooze.in.minute.one": "Em {count} minuto",
			"snooze.in.minute.other": "Em {count} minutos",
			"snooze.in.hour.one": "Em {count} hora",
			"snooze.in.hour.other": "Em {count} horas",
			"snooze.in.day.one": "Em {count} dia",
			"snooze.in.day.other": "Em {count} dias",
			"snooze.morning": "Esta manhã",
			"snooze.afternoon": "Esta tarde",
			"snooze.evening": "Esta noite",
			"snooze.tomorrow": "Amanhã",
			"snooze.nextWeek": "Próxima semana",
			"snooze.custom": "Personalizado…",
			"snooze.passed": "Esse horário já passou. Escolha outro.",
			"undo.button": "Desfazer",
			"undo.separator": ",",
			"undo.settled.one": "Resolvida",
			"undo.settled.other": "Resolvidas {count}",
			"undo.snoozed.one": "Adiada",
			"undo.snoozed.other": "Adiadas {count}",
			"undo.unpinned.one": "Desafixada",
			"undo.unpinned.other": "Desafixadas {count}",
			"undo.archived.one": "Arquivada",
			"undo.archived.other": "Arquivadas {count}",
			"error.needsAttention": "Responda à solicitação pendente antes de adiar.",
			"error.unknown": "falhou",
			"error.settle": "Não foi possível resolver a sessão: {message}",
			"error.unsettle": "Não foi possível reabrir a sessão: {message}",
			"error.snooze": "Não foi possível adiar a sessão: {message}",
			"error.wake": "Não foi possível reativar a sessão: {message}",
			"error.autoSettle": "Não foi possível alterar a resolução automática: {message}",
			"error.undo": "Não foi possível desfazer: {message}",
			"error.pin": "Não foi possível fixar a sessão: {message}",
			"error.unpin": "Não foi possível desafixar a sessão: {message}",
			"error.archive": "Não foi possível arquivar a sessão: {message}",
			"error.rename": "Não foi possível renomear a sessão: {message}",
			"error.addProject": "Não foi possível adicionar o espaço de trabalho: {message}",
			"toast.copied": "{label} copiado",
			"toast.copyFailed": "Não foi possível copiar: {label}",
			"copy.label.path": "caminho",
			"copy.label.threadId": "ID da sessão",
			"search.placeholder": "Pesquisar",
			"search.aria": "Pesquisar sessões",
			"search.clear": "Limpar pesquisa de sessões",
			"search.results": "Resultados da pesquisa de sessões",
			"search.empty": "Nenhuma sessão encontrada",
			"filter.aria": "Filtrar sessões por espaço de trabalho",
			"filter.ariaActive": "Filtrar sessões por espaço de trabalho: {projects}",
			"filter.all": "Todos os espaços de trabalho",
			"header.addProject": "Adicionar espaço de trabalho",
			"header.newThread": "Nova sessão",
			"rail.search": "Pesquisar",
			"empty.none": "Ainda não há sessões",
			"empty.project": "Ainda não há sessões em {project}",
			"empty.projects": "Ainda não há sessões nesses espaços de trabalho",
			"thread.new": "Nova sessão",
			"rename.aria": "Título da sessão",
			"related.trigger": "Sessões relacionadas",
			"related.parent": "Sessão principal",
			"related.subagents": "Subagentes",
			"related.itemAria": "{title} {status}",
			"custom.title": "Adiamento personalizado",
			"custom.close": "Fechar",
			"custom.description": "Escolha quando as sessões adiadas voltam à sua caixa de entrada.",
			"custom.cancel": "Cancelar",
			"custom.submit": "Adiar",
			"custom.scheduleType": "Tipo de agendamento",
			"custom.modeDate": "Data e hora",
			"custom.modeDuration": "Duração",
			"custom.date": "Data",
			"custom.time": "Hora",
			"custom.amount": "Adiar por",
			"custom.unit": "Unidade",
			"custom.unit.minutes": "Minutos",
			"custom.unit.hours": "Horas",
			"custom.unit.days": "Dias",
			"custom.errorDate": "Escolha uma data e hora válidas no futuro.",
			"custom.errorDuration": "Informe uma duração positiva."
		};
		//#endregion
		//#region src/client/view.ts
		/**
		* Pure sidebar view: partition listed Sessions into T3 Sidebar V2's sections.
		*
		* Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
		* `partitionSidebarThreads` in `apps/web/src/components/Sidebar.tsx`,
		* `resolveSidebarThreadSection`, `resolveSidebarThreadStatus` and
		* `shouldRecedeSidebarThread` in `Sidebar.logic.ts`, `sortInboxThreadsByReturn`,
		* `sortWorkingThreadsBySend` and `isThreadWorking` in
		* `packages/client-runtime/src/state/threadInbox.ts`, and `sortSettledThreads` in
		* `threadSort.ts`. T3 thread shells become Harness Session facts; see PORTING.md.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc. See ../logic.ts for the full notice.
		*/
		/** T3 `resolveSidebarThreadStatus`. */
		function resolveStatus(session) {
			if (session.approval) return "approval";
			if (session.question) return "input";
			if (session.running && session.blockedOnThreadWait === true) return "waiting";
			if (session.running) return "working";
			if (session.backgroundWork === true) return "waiting";
			return "ready";
		}
		/** T3 `isThreadWorking`: running or parked at idle, and not waiting on the user. */
		function isWorking(session) {
			return (session.running || session.backgroundWork === true) && !session.approval && !session.question;
		}
		/** T3 `shouldRecedeSidebarThread`. */
		function shouldRecede(input) {
			if (input.isActive || input.status === "input") return false;
			if (input.status === "working" || input.status === "waiting") return true;
			return !input.isUnread && !input.isWoke;
		}
		function byIdOrder(left, right) {
			return left.id.localeCompare(right.id);
		}
		function parse(value) {
			if (value == null) return 0;
			const ms = Date.parse(value);
			return Number.isNaN(ms) ? 0 : ms;
		}
		/** T3 `sortInboxThreadsByReturn`: newest return to the inbox first. */
		function returnAt(row) {
			return Math.max(row.activityAt, parse(row.record?.unsettledAt), row.wokeAt ?? 0);
		}
		/** T3 `sortWorkingThreadsBySend`: newest send first. */
		function sendAt(row) {
			return row.runningSince ?? row.activityAt;
		}
		/**
		* Partition and order Sessions into T3's sections.
		* @param sessions - candidate Sessions, already scoped and filtered.
		* @param records - inbox overlays keyed by Session id, optimistic edits applied.
		* @param pinOrder - pinned Session ids in pin order.
		* @param nowMs - current instant; snooze wakes derive from it.
		* @returns the sectioned view.
		*/
		function buildInboxView(sessions, records, pinOrder, nowMs) {
			const sections = {
				pinned: [],
				active: [],
				working: [],
				snoozed: [],
				settled: []
			};
			const rows = /* @__PURE__ */ new Map();
			let nextWakeAt = null;
			let attentionCount = 0;
			for (const session of sessions) {
				const record = records[session.id];
				const snoozed = record !== void 0 && effectiveSnoozed(record, session, nowMs);
				const settled = record?.settledAt != null;
				const section = snoozed ? "snoozed" : settled ? "settled" : session.pinned ? "pinned" : isWorking(session) ? "working" : "active";
				const woke = record === void 0 ? null : wokeAt(record, session, nowMs);
				const row = {
					...session,
					section,
					status: resolveStatus(session),
					record,
					wokeAt: woke,
					isWoke: isWokeUnseen({
						wokeAt: woke,
						settled,
						lastVisitedAt: session.lastVisitedAt
					}),
					autoSettleEnabled: record?.autoSettleDisabled !== true
				};
				rows.set(row.id, row);
				sections[section].push(row);
				if (snoozed) {
					const wake = parse(record.snoozedUntil);
					if (nextWakeAt === null || wake < nextWakeAt) nextWakeAt = wake;
				}
				if (section !== "settled" && section !== "snoozed" && (row.status === "approval" || row.status === "input" || row.isWoke)) attentionCount += 1;
			}
			const pinRank = new Map(pinOrder.map((id, index) => [id, index]));
			sections.pinned.sort((left, right) => (pinRank.get(left.id) ?? 0) - (pinRank.get(right.id) ?? 0));
			sections.active.sort((left, right) => returnAt(right) - returnAt(left) || byIdOrder(left, right));
			sections.working.sort((left, right) => sendAt(right) - sendAt(left) || byIdOrder(left, right));
			sections.snoozed.sort((left, right) => parse(left.record?.snoozedUntil) - parse(right.record?.snoozedUntil));
			sections.settled.sort((left, right) => (parse(right.record?.settledAt) || right.updatedAt) - (parse(left.record?.settledAt) || left.updatedAt) || byIdOrder(left, right));
			return {
				...sections,
				byId: rows,
				attentionCount,
				nextWakeAt
			};
		}
		//#endregion
		//#region src/client/model.ts
		const NO_RELATIONS = {
			parent: null,
			children: []
		};
		const PREFS_KEY = "t3-inbox:prefs";
		const VISITED_KEY = "t3-inbox:visited";
		const COMPLETED_KEY = "t3-inbox:completed";
		/** Re-read branches this often while the sidebar runs; a checkout changes them. */
		const BRANCH_REFRESH_MS = 6e4;
		/** setTimeout's ceiling is about 24.8 days; re-arm daily instead. */
		const MAX_TIMER_MS = 1440 * 60 * 1e3;
		/** Wait before reopening a stream that ended or failed. */
		const RETRY_MS = 2e3;
		/** Provider and model of a Session's latest (or pending) model selection. */
		function modelOf(values) {
			const selection = values?.modelSelection;
			const chosen = selection?.lastUsed ?? selection?.pending;
			return typeof chosen?.provider === "string" && typeof chosen.model === "string" ? {
				provider: chosen.provider,
				model: chosen.model
			} : null;
		}
		/** Latest prompt or observed run completion; the list's update time only when neither is known. */
		function activityOf(values, completedAt, updatedAt) {
			const promptAt = values?.sessionListMetadata?.lastPromptAt;
			const latest = Math.max(typeof promptAt === "number" ? promptAt : 0, completedAt ?? 0);
			return latest > 0 ? latest : updatedAt;
		}
		function readJson(key, fallback) {
			try {
				const raw = globalThis.localStorage?.getItem(key);
				return raw == null ? fallback : {
					...fallback,
					...JSON.parse(raw)
				};
			} catch {
				return fallback;
			}
		}
		function writeJson(key, value) {
			try {
				globalThis.localStorage?.setItem(key, JSON.stringify(value));
			} catch {}
		}
		/** Owner of the overlay stream, optimistic edits, visit markers, and the derived view. */
		var InboxModel = class {
			ctx;
			remote;
			inputs;
			/** Host overlay records with optimistic edits applied. */
			records = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({});
			/** Persisted per-browser preferences. */
			prefs = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(readJson(PREFS_KEY, {
				scope: [],
				workingExpanded: false,
				snoozedExpanded: false,
				settledExpanded: false
			}));
			/** Session shown in the main view, when the Conversation is showing. */
			current;
			/** Projects the scope filter offers. */
			projects;
			/** Derived view; identity changes only when an input or the wake clock changes. */
			view;
			host = {};
			/** Orchestrator thread facts by Session id, from the Host snapshot. */
			threads = {};
			threadsKey = "{}";
			pending = /* @__PURE__ */ new Map();
			lastCurrent = null;
			seq = 0;
			visited = readJson(VISITED_KEY, {});
			completed = readJson(COMPLETED_KEY, {});
			running = /* @__PURE__ */ new Map();
			branches = {};
			branchFetch;
			runningSince = /* @__PURE__ */ new Map();
			questionAt = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			tick = 0;
			timer;
			cache;
			projectCache;
			currentCache;
			stream;
			constructor(ctx, remote, inputs) {
				this.ctx = ctx;
				this.remote = remote;
				this.inputs = inputs;
				const subscribe = (listener) => {
					this.listeners.add(listener);
					return () => {
						this.listeners.delete(listener);
					};
				};
				this.view = {
					getSnapshot: () => this.compute(),
					subscribe
				};
				this.current = {
					getSnapshot: () => this.rowOf(this.currentId()),
					subscribe
				};
				this.projects = {
					getSnapshot: () => this.projectList(),
					subscribe
				};
				const notify = () => {
					for (const listener of [...this.listeners]) listener();
				};
				const stops = [
					this.records.subscribe(notify),
					this.prefs.subscribe(() => {
						writeJson(PREFS_KEY, this.prefs.getSnapshot());
						notify();
					}),
					inputs.sessions.subscribe(notify),
					inputs.status.subscribe(notify),
					...inputs.workspaces === void 0 ? [] : [inputs.workspaces.subscribe(notify)],
					...inputs.panel === void 0 ? [] : [inputs.panel.subscribe(notify)]
				];
				ctx.effect(() => () => {
					for (const stop of stops) stop();
					clearTimeout(this.timer);
					this.stream?.abort();
					this.listeners.clear();
				}, "t3-inbox: model");
				ctx.on("connection/reset", () => {
					this.open();
				});
				this.open();
				ctx.effect(() => {
					const timer = setInterval(() => {
						this.fetchBranches(true);
					}, BRANCH_REFRESH_MS);
					return () => {
						clearInterval(timer);
					};
				}, "t3-inbox: branch refresh");
			}
			/**
			* Read the git branch of every listed working directory not yet known (or all of them).
			* @param all - refresh known directories too.
			*/
			async fetchBranches(all) {
				if (this.branchFetch !== void 0) return;
				const cwds = [...new Set(Object.values(this.inputs.sessions.getSnapshot().byId).flatMap((summary) => summary.cwd === void 0 ? [] : [summary.cwd]))].filter((cwd) => all || !(cwd in this.branches));
				if (cwds.length === 0) return;
				this.branchFetch = (async () => {
					try {
						const result = await this.remote.branches(cwds);
						if (!result.ok) return;
						const next = {
							...this.branches,
							...result.value
						};
						for (const cwd of cwds) if (!(cwd in result.value)) next[cwd] = null;
						if (cwds.some((cwd) => next[cwd] !== this.branches[cwd]) || cwds.some((cwd) => !(cwd in this.branches))) {
							this.branches = next;
							this.tick += 1;
							for (const listener of [...this.listeners]) listener();
						}
					} catch {} finally {
						this.branchFetch = void 0;
					}
				})();
			}
			/** (Re)open the Host follow stream; one stream runs at a time. */
			open() {
				this.stream?.abort();
				const controller = new AbortController();
				this.stream = controller;
				(async () => {
					while (!controller.signal.aborted) {
						try {
							for await (const snapshot of this.remote.follow(controller.signal)) {
								if (controller.signal.aborted) return;
								this.host = snapshot.records;
								const threadsKey = JSON.stringify(snapshot.threads ?? {});
								if (threadsKey !== this.threadsKey) {
									this.threadsKey = threadsKey;
									this.threads = snapshot.threads ?? {};
									this.tick += 1;
								}
								for (const [id, edit] of this.pending) if (edit.confirmed) this.pending.delete(id);
								this.publish();
							}
						} catch (error) {
							if (!controller.signal.aborted) this.ctx.logger.warn("t3-inbox: follow stream failed; retrying", error);
						}
						if (controller.signal.aborted) return;
						await new Promise((resolve) => {
							setTimeout(resolve, RETRY_MS);
						});
					}
				})();
			}
			publish() {
				const merged = new Map(Object.entries(this.host));
				for (const [id, edit] of this.pending) if (edit.record === null) merged.delete(id);
				else merged.set(id, edit.record);
				this.records.set(Object.fromEntries(merged));
			}
			/**
			* Apply an edit at once and keep it until the Host confirms or rejects it, so a settled
			* row moves immediately (T3's optimistic drop).
			* @param sessionId - Session the edit targets.
			* @param edit - next overlay, or null to clear it.
			* @param request - the Host write.
			* @returns the Host result.
			*/
			async optimistic(sessionId, edit, request) {
				const entry = {
					seq: ++this.seq,
					record: edit(this.records.getSnapshot()[sessionId]),
					confirmed: false
				};
				this.pending.set(sessionId, entry);
				this.publish();
				const drop = () => {
					if (this.pending.get(sessionId) !== entry) return;
					this.pending.delete(sessionId);
					this.publish();
				};
				try {
					const result = await request();
					if (!result.ok) drop();
					else {
						entry.confirmed = true;
						setTimeout(drop, RETRY_MS);
					}
					return result;
				} catch (error) {
					drop();
					throw error;
				}
			}
			/**
			* Current overlay of a Session, optimistic edits included.
			* @param sessionId - Session id.
			* @returns the record, or undefined while it has none.
			*/
			record(sessionId) {
				return this.records.getSnapshot()[sessionId];
			}
			/**
			* Record that the user saw a Session now (T3 `lastVisitedAt`).
			* @param sessionId - Session shown.
			*/
			markVisited(sessionId) {
				this.visited = {
					...this.visited,
					[sessionId]: Date.now()
				};
				writeJson(VISITED_KEY, this.visited);
				this.tick += 1;
				for (const listener of [...this.listeners]) listener();
			}
			/**
			* Change persisted preferences.
			* @param patch - fields to replace.
			*/
			setPrefs(patch) {
				this.prefs.set({
					...this.prefs.getSnapshot(),
					...patch
				});
			}
			currentId() {
				const list = this.inputs.sessions.getSnapshot();
				const panel = this.inputs.panel?.getSnapshot().activePanelId ?? null;
				const key = [list, panel];
				const cached = this.currentCache;
				if (cached !== void 0 && cached.key.every((value, index) => value === key[index])) return cached.value;
				const value = panel !== null ? null : Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id ?? null;
				this.currentCache = {
					key,
					value
				};
				return value;
			}
			/**
			* T3 `resolveSidebarRowThreadId`: an open subagent thread has no row, so its nearest
			* listed ancestor stands in for it. A broken chain resolves to the Session itself.
			*/
			rowOf(sessionId) {
				if (sessionId === null) return null;
				const seen = /* @__PURE__ */ new Set();
				let id = sessionId;
				while (this.threads[id]?.listed === false) {
					const parent = this.threads[id]?.parentSessionId ?? null;
					if (parent === null || seen.has(id)) return sessionId;
					seen.add(id);
					id = parent;
				}
				return id;
			}
			/**
			* Parent and subagents of one Session, from the orchestrator's thread facts.
			* @param sessionId - Session shown.
			* @returns an observable of its relations.
			*/
			relationsOf(sessionId) {
				let cache;
				const getSnapshot = () => {
					const list = this.inputs.sessions.getSnapshot();
					const status = this.inputs.status.getSnapshot();
					const key = [
						this.threadsKey,
						list,
						status
					];
					if (cache !== void 0 && cache.key.every((value, index) => value === key[index])) return cache.value;
					const related = (id) => {
						const summary = list.byId[id];
						const facts = status.get(id);
						const thread = this.threads[id];
						const pending = facts?.pendingInteraction;
						return {
							id,
							title: summary?.title ?? summary?.displayTitle ?? id,
							status: resolveStatus({
								running: facts?.running ?? summary?.running ?? false,
								approval: pending?.kind === "approval",
								question: pending !== void 0 && pending.kind !== "approval",
								questionAt: null,
								updatedAt: summary?.updatedAt ?? 0,
								blockedOnThreadWait: thread?.blockedOnThreadWait ?? false,
								backgroundWork: thread?.backgroundWork ?? false
							})
						};
					};
					const parentId = this.threads[sessionId]?.parentSessionId ?? null;
					const children = Object.entries(this.threads).filter(([id, fact]) => fact.parentSessionId === sessionId && list.byId[id] !== void 0).map(([id]) => related(id));
					const value = parentId === null && children.length === 0 ? NO_RELATIONS : {
						parent: parentId === null ? null : related(parentId),
						children
					};
					cache = {
						key,
						value
					};
					return value;
				};
				return {
					getSnapshot,
					subscribe: (listener) => {
						this.listeners.add(listener);
						return () => {
							this.listeners.delete(listener);
						};
					}
				};
			}
			projectList() {
				const items = this.inputs.workspaces?.getSnapshot().items;
				if (this.projectCache !== void 0 && this.projectCache.key === items) return this.projectCache.value;
				const value = (items ?? []).map((item) => ({
					id: item.workspaceId,
					name: item.title
				}));
				this.projectCache = {
					key: items,
					value
				};
				return value;
			}
			observe(list, status, now) {
				for (const id of list.ids) {
					const facts = status.get(id);
					const running = facts?.running ?? list.byId[id]?.running ?? false;
					if (running && !this.runningSince.has(id)) this.runningSince.set(id, now);
					if (!running) this.runningSince.delete(id);
					if (this.running.get(id) === true && !running) {
						this.completed = {
							...this.completed,
							[id]: now
						};
						writeJson(COMPLETED_KEY, this.completed);
					}
					this.running.set(id, running);
					const question = facts?.pendingInteraction !== void 0 && facts.pendingInteraction.kind !== "approval";
					if (question && !this.questionAt.has(id)) this.questionAt.set(id, now);
					if (!question) this.questionAt.delete(id);
				}
			}
			inputsOf(list, status, workspaces) {
				const archived = new Set(workspaces?.archivedSessionIds ?? []);
				const pinned = new Set(workspaces?.pinnedSessionIds ?? []);
				const projectOf = /* @__PURE__ */ new Map();
				for (const item of workspaces?.items ?? []) for (const sessionId of item.sessionIds) projectOf.set(sessionId, {
					id: item.workspaceId,
					name: item.title
				});
				const scope = new Set(this.prefs.getSnapshot().scope);
				const current = this.currentId();
				const sessions = [];
				for (const id of list.ids) {
					const summary = list.byId[id];
					if (summary === void 0 || summary.origin === "subagent" || archived.has(id)) continue;
					const thread = this.threads[id];
					if (thread?.listed === false) continue;
					if (summary.blank && id !== current) continue;
					const project = projectOf.get(id) ?? null;
					if (scope.size > 0 && (project === null || !scope.has(project.id))) continue;
					const facts = status.get(id);
					const pending = facts?.pendingInteraction;
					const running = facts?.running ?? summary.running;
					sessions.push({
						id,
						title: summary.title ?? (summary.blank ? this.ctx.locale.bind("t3Inbox")("thread.new") : summary.displayTitle),
						projectId: project?.id ?? null,
						projectName: project?.name ?? null,
						cwd: summary.cwd ?? null,
						pinned: pinned.has(id),
						running,
						approval: pending?.kind === "approval",
						question: pending !== void 0 && pending.kind !== "approval",
						questionAt: this.questionAt.get(id) ?? null,
						unread: (facts?.completionUnread ?? false) || this.unseenCompletion(id, current),
						activityAt: activityOf(summary.projectionValues, this.completed[id], summary.updatedAt),
						branch: summary.cwd === void 0 ? null : this.branches[summary.cwd] ?? null,
						model: modelOf(summary.projectionValues),
						updatedAt: summary.updatedAt,
						runningSince: running ? this.runningSince.get(id) ?? null : null,
						lastVisitedAt: id === current ? Date.now() : this.visited[id] ?? null,
						blockedOnThreadWait: thread?.blockedOnThreadWait ?? false,
						backgroundWork: thread?.backgroundWork ?? false
					});
				}
				return sessions;
			}
			/** T3 `hasUnseenCompletion`: a finished run after the last visit, once the Session was ever visited. */
			unseenCompletion(id, current) {
				if (id === current) return false;
				const completedAt = this.completed[id];
				const visitedAt = this.visited[id];
				return completedAt !== void 0 && visitedAt !== void 0 && completedAt > visitedAt;
			}
			compute() {
				const list = this.inputs.sessions.getSnapshot();
				const status = this.inputs.status.getSnapshot();
				const workspaces = this.inputs.workspaces?.getSnapshot();
				const key = [
					this.records.getSnapshot(),
					list,
					status,
					workspaces,
					this.prefs.getSnapshot(),
					this.currentId(),
					this.tick
				];
				if (this.cache !== void 0 && this.cache.key.every((value, index) => value === key[index])) return this.cache.view;
				const now = Date.now();
				this.observe(list, status, now);
				this.fetchBranches(false);
				const current = this.currentId();
				if (current !== this.lastCurrent) {
					const visited = { ...this.visited };
					if (this.lastCurrent !== null) visited[this.lastCurrent] = now;
					if (current !== null) visited[current] = now;
					this.visited = visited;
					writeJson(VISITED_KEY, visited);
					this.lastCurrent = current;
				}
				const view = buildInboxView(this.inputsOf(list, status, workspaces), this.records.getSnapshot(), workspaces?.pinnedSessionIds ?? [], now);
				this.cache = {
					key,
					view
				};
				this.arm(view.nextWakeAt);
				return view;
			}
			/** Re-derive once when the earliest snooze wakes; nothing repaints in between. */
			arm(nextWakeAt) {
				clearTimeout(this.timer);
				this.timer = void 0;
				if (nextWakeAt === null || this.ctx.fiber.uid === null) return;
				const delay = Math.min(Math.max(nextWakeAt - Date.now() + 50, 0), MAX_TIMER_MS);
				this.timer = setTimeout(() => {
					this.tick += 1;
					for (const listener of [...this.listeners]) listener();
				}, delay);
			}
		};
		//#endregion
		//#region \0dsh-css:<dsh>\packages\experimental\t3-inbox\src\client\t3\Sidebar.module.css.mjs
		const css = ".peqfxa_root,.peqfxa_tokens{--t3-fg:var(--dsw-alias-label-primary);--t3-muted:var(--dsw-alias-label-tertiary);--t3-row-hover:var(--dsw-alias-interactive-bg-hover);--t3-row-active:var(--dsw-alias-bg-base);--t3-row-active-ring:color-mix(in srgb, var(--dsw-alias-border-l3) 70%, transparent);--t3-border:var(--dsw-alias-border-l3);--t3-ring:var(--dsw-alias-state-business-primary);--t3-info:oklch(48.8% .243 264.376);--t3-success:oklch(50.8% .118 165.612);--t3-warning:oklch(55.5% .163 48.998);--t3-indigo:oklch(51.1% .262 276.966);--t3-content-inset:8px;--t3-row-inset:10px;--t3-radius-md:6px;--t3-radius-sm:4px}body[data-ds-dark-theme] .peqfxa_root,body[data-ds-dark-theme] .peqfxa_tokens{--t3-row-active:color-mix(in srgb, var(--dsw-alias-label-primary) 11%, transparent);--t3-row-active-ring:transparent;--t3-info:oklch(70.7% .165 254.624);--t3-success:oklch(76.5% .177 163.223);--t3-warning:oklch(82.8% .189 84.429);--t3-indigo:oklch(78.5% .115 274.713)}.peqfxa_root{min-height:min(var(--t3-fill,0px), 100cqh);max-height:100cqh;color:var(--t3-fg);flex-direction:column;flex:none;font-size:14px;line-height:20px;display:flex;position:relative}.peqfxa_header{flex:none;align-items:center;gap:4px;margin-bottom:4px;display:flex}.peqfxa_searchBox{box-sizing:border-box;border-radius:var(--t3-radius-md);min-width:0;height:32px;color:var(--t3-muted);flex:1;align-items:center;gap:8px;padding:6px 8px;font-size:14px;font-weight:500;display:flex}.peqfxa_searchBox:hover,.peqfxa_searchBox:focus-within{background:var(--t3-row-hover);color:var(--t3-fg)}.peqfxa_searchBox:focus-within{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--t3-ring) 70%, transparent)}.peqfxa_searchIcon{color:var(--t3-muted);flex:none}.peqfxa_searchInput{min-width:0;height:20px;color:var(--t3-fg);font:inherit;background:0 0;border:0;outline:none;flex:1;padding:0}.peqfxa_searchInput::placeholder{color:var(--t3-muted)}.peqfxa_searchInput::-webkit-search-cancel-button{display:none}.peqfxa_clearSearch{border-radius:var(--t3-radius-sm);width:20px;height:20px;color:var(--t3-muted);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.peqfxa_clearSearch:hover{color:var(--t3-fg)}.peqfxa_headerIcons{flex:none;align-items:center;display:flex}.peqfxa_headerIcon{border-radius:var(--t3-radius-md);width:28px;height:28px;color:var(--t3-muted);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:relative}.peqfxa_headerIcon:hover{background:var(--t3-row-hover);color:var(--t3-fg)}.peqfxa_headerIconActive{color:var(--t3-fg)}.peqfxa_headerIcon:focus-visible,.peqfxa_rowSurface:focus-visible,.peqfxa_shelfButton:focus-visible,.peqfxa_showMore:focus-visible{box-shadow:inset 0 0 0 2px var(--t3-ring);outline:none}.peqfxa_listArea{min-height:0;margin-left:-4px;margin-right:calc(2px - var(--dsh-sidebar-inline-padding,8px));padding-left:4px;padding-right:calc(var(--dsh-sidebar-inline-padding,8px) - var(--dsh-scrollbar-width,6px) - 2px);scrollbar-gutter:stable;flex-direction:column;flex:1;display:flex;overflow:hidden auto}.peqfxa_list{flex-direction:column;flex:1 0 auto;gap:1px;margin:0;padding:0;list-style:none;display:flex;position:relative}.peqfxa_listItem{list-style:none}.peqfxa_mtAuto,.peqfxa_shelfItem.peqfxa_mtAuto{margin-top:auto}.peqfxa_cardItem{padding:2px 0;list-style:none}.peqfxa_slimItem{list-style:none}.peqfxa_rowSurface{border-radius:var(--t3-radius-md);cursor:pointer;text-align:left;user-select:none;outline:none;width:100%;display:block;position:relative;overflow:hidden}.peqfxa_rowIdle{color:var(--t3-fg);background:0 0}.peqfxa_rowIdle:hover{background:var(--t3-row-hover)}.peqfxa_rowRecede{color:color-mix(in srgb, var(--t3-muted) 75%, transparent)}.peqfxa_rowRecede:hover{background:var(--t3-row-hover);color:var(--t3-fg)}.peqfxa_rowActive{background:var(--t3-row-active);box-shadow:inset 0 0 0 1px var(--t3-row-active-ring);color:var(--t3-fg)}.peqfxa_rowWorkingRecede{opacity:.7;transition:opacity .15s cubic-bezier(.4,0,.2,1)}.peqfxa_rowWorkingRecede:hover,.peqfxa_rowWorkingRecede:focus-within{opacity:1}.peqfxa_settledMuted:not(:hover):not(:focus-within) *{color:var(--t3-muted)}.peqfxa_cardContent{z-index:1;padding:var(--t3-content-inset) var(--t3-row-inset);position:relative}.peqfxa_cardTop{align-items:center;gap:6px;min-width:0;height:20px;display:flex}.peqfxa_projectIcon{color:var(--t3-muted);flex:none}.peqfxa_projectName{min-width:0;color:var(--t3-muted);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;font-weight:400;line-height:16px;overflow:hidden}.peqfxa_flex1{flex:1}.peqfxa_statusSlot{flex:none;justify-content:flex-end;align-items:stretch;min-width:32px;height:20px;margin-left:auto;font-size:12px;line-height:16px;display:flex;position:relative}.peqfxa_statusLabel{color:var(--t3-muted);font-variant-numeric:tabular-nums;pointer-events:none;align-self:center;align-items:center;display:flex}.peqfxa_statusLabel:has(button){pointer-events:auto}@media (any-hover:hover){.peqfxa_rowSurface:hover .peqfxa_hideOnRowHover{opacity:0;position:absolute;right:0}}.peqfxa_statusSlot:has(:focus-visible) .peqfxa_hideOnRowHover{opacity:0;position:absolute;right:0}.peqfxa_statusHidden{opacity:0;pointer-events:none;position:absolute;right:0}.peqfxa_statusPill{align-items:center;gap:4px;font-weight:500;display:inline-flex}.peqfxa_statusPill>svg{flex:none}.peqfxa_tabular{font-variant-numeric:tabular-nums}:lang(zh) .peqfxa_statusPill>svg,:lang(zh) .peqfxa_wokeButton>svg,:lang(zh) .peqfxa_settleButton>svg,:lang(zh) .peqfxa_wakeLabel>svg,:lang(ja) .peqfxa_statusPill>svg,:lang(ja) .peqfxa_wokeButton>svg,:lang(ja) .peqfxa_settleButton>svg,:lang(ja) .peqfxa_wakeLabel>svg{transform:translateY(1px)}.peqfxa_toneInfo{color:var(--t3-info)}.peqfxa_toneMuted{color:var(--t3-muted)}.peqfxa_toneSuccess{color:var(--t3-success)}.peqfxa_toneWarning{color:var(--t3-warning)}.peqfxa_toneIndigo{color:var(--t3-indigo)}.peqfxa_wokeButton{border-radius:var(--t3-radius-sm);font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;padding:0;font-weight:500;display:inline-flex}.peqfxa_wokeButton:hover{text-decoration:underline}.peqfxa_rowControls{opacity:0;pointer-events:none;align-items:stretch;display:flex;position:absolute;top:0;bottom:0;right:0}@media (any-hover:hover){.peqfxa_rowSurface:hover .peqfxa_rowControls{opacity:1;pointer-events:auto;position:static}}.peqfxa_rowControls:has(:focus-visible),.peqfxa_rowControlsOpen{opacity:1;pointer-events:auto;position:static}.peqfxa_snoozeButton{border-radius:var(--t3-radius-md);height:100%;color:var(--t3-muted);cursor:pointer;background:0 0;border:0;align-items:center;gap:2px;padding:0 6px;font-size:12px;display:inline-flex}.peqfxa_settleButton{border-radius:var(--t3-radius-md);height:100%;color:var(--t3-muted);font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;margin-right:-4px;padding:0 6px;font-size:12px;display:inline-flex}.peqfxa_snoozeButton:hover,.peqfxa_settleButton:hover,.peqfxa_slimAction:hover,.peqfxa_unpin:hover{color:var(--t3-fg)}.peqfxa_cardTitleLine{align-items:center;gap:6px;min-width:0;margin-top:4px;display:flex}.peqfxa_title{text-align:start;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:14px;line-height:20px;overflow:hidden}.peqfxa_titleStrong{color:var(--t3-fg);font-weight:500}.peqfxa_titleRecede{color:color-mix(in srgb, var(--t3-fg) 75%, transparent);font-weight:400}.peqfxa_rowSurface:hover .peqfxa_titleRecede,.peqfxa_rowSurface:focus-visible .peqfxa_titleRecede{color:var(--t3-fg)}.peqfxa_weightMedium{font-weight:500}.peqfxa_slimRecede{color:var(--t3-muted);font-weight:400}.peqfxa_slimStrong{color:var(--t3-fg)}.peqfxa_slimUnread{color:var(--t3-muted)}.peqfxa_slimQuiet{color:color-mix(in srgb, var(--t3-muted) 70%, transparent)}.peqfxa_rowSurface:hover .peqfxa_titleSlim,.peqfxa_rowSurface:focus-within .peqfxa_titleSlim{color:var(--t3-fg)}.peqfxa_slimRow{box-sizing:border-box;align-items:center;gap:10px;height:36px;padding:0 10px;display:flex}.peqfxa_slimIcon{color:var(--t3-muted);flex:none;align-items:center;transition:opacity .15s cubic-bezier(.4,0,.2,1),filter .15s cubic-bezier(.4,0,.2,1);display:flex}.peqfxa_slimIconDim{opacity:.4;filter:grayscale()}.peqfxa_rowSurface:hover .peqfxa_slimIconDim,.peqfxa_rowSurface:focus-within .peqfxa_slimIconDim{opacity:1;filter:none}.peqfxa_slimTrailing{flex:none;justify-content:flex-end;align-items:center;min-width:32px;height:24px;margin-left:auto;display:flex;position:relative}.peqfxa_slimLabel{color:var(--t3-muted);font-variant-numeric:tabular-nums;justify-content:flex-end;transition:opacity .15s cubic-bezier(.4,0,.2,1);display:inline-flex}@media (any-hover:hover){.peqfxa_rowSurface:hover .peqfxa_slimLabel.peqfxa_hideOnRowHover{opacity:0;position:static}}.peqfxa_textXs{font-size:12px;line-height:16px}.peqfxa_wakeLabel{font-variant-numeric:tabular-nums;align-items:center;gap:4px;font-size:12px;line-height:16px;display:inline-flex}.peqfxa_slimAction{border-radius:var(--t3-radius-md);color:var(--t3-muted);opacity:0;pointer-events:none;cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;margin-right:-4px;padding:0 6px;font-size:12px;transition:opacity .15s cubic-bezier(.4,0,.2,1);display:inline-flex;position:absolute;top:0;bottom:0;right:0}.peqfxa_slimSettle{margin-right:0;padding:0 8px}.peqfxa_slimAction:focus-visible{opacity:1;pointer-events:auto}@media (any-hover:hover){.peqfxa_rowSurface:hover .peqfxa_slimAction{opacity:1;pointer-events:auto}.peqfxa_rowSurface:hover .peqfxa_slimActionStatic{position:static}}.peqfxa_unpin{border-radius:var(--t3-radius-sm);color:color-mix(in srgb, var(--t3-muted) 65%, transparent);cursor:pointer;background:0 0;border:0;align-items:center;padding:0;display:inline-flex}.peqfxa_pinOff,.peqfxa_unpin:hover .peqfxa_pinOn,.peqfxa_unpin:focus-visible .peqfxa_pinOn{display:none}.peqfxa_unpin:hover .peqfxa_pinOff,.peqfxa_unpin:focus-visible .peqfxa_pinOff{display:block}.peqfxa_renameInput{border:1px solid var(--t3-border);border-radius:var(--t3-radius-sm);background:var(--dsw-alias-bg-base);min-width:0;color:var(--t3-fg);font:inherit;outline:none;flex:1;padding:0 4px;font-size:14px;font-weight:500}.peqfxa_renameInput:focus{border-color:var(--t3-fg)}.peqfxa_shelfItem{height:32px;margin:0 2px;list-style:none;position:relative}.peqfxa_shelfButton{border-radius:var(--t3-radius-md);width:100%;height:32px;color:var(--t3-muted);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:8px;padding:0 8px;font-size:12px;font-weight:500;line-height:16px;display:flex}.peqfxa_shelfLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.peqfxa_shelfRule{visibility:hidden;flex:1;min-width:8px;height:1px}.peqfxa_shelfCount{font-variant-numeric:tabular-nums;font-weight:400}.peqfxa_shelfChevron{flex:none;transition:transform .15s cubic-bezier(.4,0,.2,1)}.peqfxa_shelfChevronClosed{transform:rotate(-90deg)}.peqfxa_showMore{border-radius:var(--t3-radius-md);width:100%;height:36px;color:var(--t3-muted);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:10px;padding:0 10px;font-size:14px;display:flex}.peqfxa_showMore:hover,.peqfxa_shelfButton:hover{background:var(--t3-row-hover);color:var(--t3-fg)}.peqfxa_searchList{flex-direction:column;gap:1px;margin:0;padding:0;list-style:none;display:flex}.peqfxa_searchActive .peqfxa_rowSurface{background:var(--t3-row-hover)}.peqfxa_searchEmpty{color:var(--t3-muted);text-align:center;margin:0;padding:24px 8px;font-size:12px}.peqfxa_empty{color:color-mix(in srgb, var(--t3-muted) 60%, transparent);text-align:center;flex-direction:column;align-items:center;gap:8px;padding:24px 8px;font-size:12px;display:flex}.peqfxa_rail{flex-direction:column;align-items:center;gap:12px;display:flex}.peqfxa_rail .peqfxa_headerIcon{border-radius:var(--dsw-radius-md);width:36px;height:36px;color:var(--dsw-alias-label-primary)}.peqfxa_size3{width:12px;height:12px}.peqfxa_size35{width:14px;height:14px}.peqfxa_size4{width:16px;height:16px}.peqfxa_shrink0{flex-shrink:0}.peqfxa_menuPreset{flex:1;justify-content:space-between;align-items:center;gap:16px;min-width:0;display:flex}.peqfxa_menuDetail{color:var(--dsw-alias-label-tertiary);font-size:12px}.peqfxa_hoverCard{color:#ffffffeb;flex-direction:column;gap:8px;min-width:0;max-width:320px;display:flex}.peqfxa_hoverTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12px;font-weight:500;line-height:1.25;overflow:hidden}.peqfxa_hoverGrid{color:#fff9;gap:6px;padding-left:2px;font-size:12px;line-height:16px;display:grid}.peqfxa_hoverLine{align-items:center;gap:8px;min-width:0;display:flex}.peqfxa_hoverLine>svg{flex:none}.peqfxa_hoverValue{color:#ffffffbf;text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.peqfxa_undo{min-width:0;height:24px;padding-inline:var(--dsh-sidebar-row-padding,12px);color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex-flow:row-reverse wrap;flex:1;justify-content:flex-end;column-gap:4px;font-size:11px;line-height:24px;transition:opacity .2s ease-out;display:flex;overflow:hidden}@starting-style{.peqfxa_undo{opacity:0}}.peqfxa_undoHidden{opacity:0}.peqfxa_undoButton{min-width:0;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-weight:500}.peqfxa_undoButton:hover{text-decoration:underline}.peqfxa_brand{align-items:center;gap:4px;min-width:0;display:inline-flex}.peqfxa_brandMark{letter-spacing:-.025em;font-size:14px;font-weight:600}.peqfxa_brandName{color:var(--dsw-alias-label-tertiary);letter-spacing:-.025em;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;overflow:hidden}.peqfxa_historyButton{width:28px;height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.peqfxa_historyButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.peqfxa_historyButton:disabled{opacity:.5;cursor:default}.peqfxa_cardContentTall{box-sizing:border-box;height:78px}.peqfxa_metaLine{min-width:0;color:var(--t3-muted);align-items:center;gap:6px;margin-top:2px;font-size:12px;line-height:16px;display:flex}.peqfxa_branch{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.peqfxa_metaIcons{pointer-events:none;flex:none;align-items:center;gap:4px;margin-left:auto;display:inline-flex}.peqfxa_providerIcon{opacity:.6;flex:none}.peqfxa_hoverProvider{opacity:.6;filter:grayscale();flex:none;width:12px;height:12px}.peqfxa_footerRow{min-width:0;padding:0 var(--dsh-sidebar-inline-padding,8px);align-items:center;gap:4px;display:flex}.peqfxa_footerRail{flex-direction:column;padding:0}.peqfxa_footerRow .peqfxa_undo{padding-inline:4px}.peqfxa_footerIcons{flex:none;align-items:center;margin-left:auto;display:flex}.peqfxa_footerIcons .peqfxa_headerIcon:empty{display:none}.peqfxa_footerRail .peqfxa_footerIcons{flex-direction:column;gap:12px;margin-left:0}.peqfxa_footerRail .peqfxa_headerIcon{border-radius:var(--dsw-radius-md);width:36px;height:36px;color:var(--dsw-alias-label-primary)}.peqfxa_relatedTrigger{border-radius:var(--t3-radius-md,6px);max-width:244px;min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex}.peqfxa_relatedTrigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.peqfxa_relatedRow{align-items:center;gap:8px;min-width:0;max-width:320px;display:inline-flex}.peqfxa_relatedTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}";
		const tagId = "@deepseek-ai/dsh-experimental-t3-inbox/Sidebar.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-experimental-t3-inbox";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var Sidebar_module_css_default = {
			"branch": "peqfxa_branch",
			"brand": "peqfxa_brand",
			"brandMark": "peqfxa_brandMark",
			"brandName": "peqfxa_brandName",
			"cardContent": "peqfxa_cardContent",
			"cardContentTall": "peqfxa_cardContentTall",
			"cardItem": "peqfxa_cardItem",
			"cardTitleLine": "peqfxa_cardTitleLine",
			"cardTop": "peqfxa_cardTop",
			"clearSearch": "peqfxa_clearSearch",
			"empty": "peqfxa_empty",
			"flex1": "peqfxa_flex1",
			"footerIcons": "peqfxa_footerIcons",
			"footerRail": "peqfxa_footerRail",
			"footerRow": "peqfxa_footerRow",
			"header": "peqfxa_header",
			"headerIcon": "peqfxa_headerIcon",
			"headerIconActive": "peqfxa_headerIconActive",
			"headerIcons": "peqfxa_headerIcons",
			"hideOnRowHover": "peqfxa_hideOnRowHover",
			"historyButton": "peqfxa_historyButton",
			"hoverCard": "peqfxa_hoverCard",
			"hoverGrid": "peqfxa_hoverGrid",
			"hoverLine": "peqfxa_hoverLine",
			"hoverProvider": "peqfxa_hoverProvider",
			"hoverTitle": "peqfxa_hoverTitle",
			"hoverValue": "peqfxa_hoverValue",
			"list": "peqfxa_list",
			"listArea": "peqfxa_listArea",
			"listItem": "peqfxa_listItem",
			"menuDetail": "peqfxa_menuDetail",
			"menuPreset": "peqfxa_menuPreset",
			"metaIcons": "peqfxa_metaIcons",
			"metaLine": "peqfxa_metaLine",
			"mtAuto": "peqfxa_mtAuto",
			"pinOff": "peqfxa_pinOff",
			"pinOn": "peqfxa_pinOn",
			"projectIcon": "peqfxa_projectIcon",
			"projectName": "peqfxa_projectName",
			"providerIcon": "peqfxa_providerIcon",
			"rail": "peqfxa_rail",
			"relatedRow": "peqfxa_relatedRow",
			"relatedTitle": "peqfxa_relatedTitle",
			"relatedTrigger": "peqfxa_relatedTrigger",
			"renameInput": "peqfxa_renameInput",
			"root": "peqfxa_root",
			"rowActive": "peqfxa_rowActive",
			"rowControls": "peqfxa_rowControls",
			"rowControlsOpen": "peqfxa_rowControlsOpen",
			"rowIdle": "peqfxa_rowIdle",
			"rowRecede": "peqfxa_rowRecede",
			"rowSurface": "peqfxa_rowSurface",
			"rowWorkingRecede": "peqfxa_rowWorkingRecede",
			"searchActive": "peqfxa_searchActive",
			"searchBox": "peqfxa_searchBox",
			"searchEmpty": "peqfxa_searchEmpty",
			"searchIcon": "peqfxa_searchIcon",
			"searchInput": "peqfxa_searchInput",
			"searchList": "peqfxa_searchList",
			"settleButton": "peqfxa_settleButton",
			"settledMuted": "peqfxa_settledMuted",
			"shelfButton": "peqfxa_shelfButton",
			"shelfChevron": "peqfxa_shelfChevron",
			"shelfChevronClosed": "peqfxa_shelfChevronClosed",
			"shelfCount": "peqfxa_shelfCount",
			"shelfItem": "peqfxa_shelfItem",
			"shelfLabel": "peqfxa_shelfLabel",
			"shelfRule": "peqfxa_shelfRule",
			"showMore": "peqfxa_showMore",
			"shrink0": "peqfxa_shrink0",
			"size3": "peqfxa_size3",
			"size35": "peqfxa_size35",
			"size4": "peqfxa_size4",
			"slimAction": "peqfxa_slimAction",
			"slimActionStatic": "peqfxa_slimActionStatic",
			"slimIcon": "peqfxa_slimIcon",
			"slimIconDim": "peqfxa_slimIconDim",
			"slimItem": "peqfxa_slimItem",
			"slimLabel": "peqfxa_slimLabel",
			"slimQuiet": "peqfxa_slimQuiet",
			"slimRecede": "peqfxa_slimRecede",
			"slimRow": "peqfxa_slimRow",
			"slimSettle": "peqfxa_slimSettle",
			"slimStrong": "peqfxa_slimStrong",
			"slimTrailing": "peqfxa_slimTrailing",
			"slimUnread": "peqfxa_slimUnread",
			"snoozeButton": "peqfxa_snoozeButton",
			"statusHidden": "peqfxa_statusHidden",
			"statusLabel": "peqfxa_statusLabel",
			"statusPill": "peqfxa_statusPill",
			"statusSlot": "peqfxa_statusSlot",
			"tabular": "peqfxa_tabular",
			"textXs": "peqfxa_textXs",
			"title": "peqfxa_title",
			"titleRecede": "peqfxa_titleRecede",
			"titleSlim": "peqfxa_titleSlim",
			"titleStrong": "peqfxa_titleStrong",
			"tokens": "peqfxa_tokens",
			"toneIndigo": "peqfxa_toneIndigo",
			"toneInfo": "peqfxa_toneInfo",
			"toneMuted": "peqfxa_toneMuted",
			"toneSuccess": "peqfxa_toneSuccess",
			"toneWarning": "peqfxa_toneWarning",
			"undo": "peqfxa_undo",
			"undoButton": "peqfxa_undoButton",
			"undoHidden": "peqfxa_undoHidden",
			"unpin": "peqfxa_unpin",
			"wakeLabel": "peqfxa_wakeLabel",
			"weightMedium": "peqfxa_weightMedium",
			"wokeButton": "peqfxa_wokeButton"
		};
		//#endregion
		//#region src/client/t3/Chrome.tsx
		/**
		* Sidebar chrome around the thread list: the compact brand name, the footer utility row
		* (undo notice plus the global panels T3 reaches from its footer), and the stylesheet
		* that hides the dsh controls the T3 header replaces.
		*
		* Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
		* `SidebarBrandMark` and `SidebarChromeFooter` in
		* `apps/web/src/components/sidebar/SidebarChrome.tsx`, and
		* `apps/web/src/components/sidebar/SidebarThreadUndoNotice.tsx`.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
		*/
		/**
		* dsh controls the T3 header replaces, hidden while the plugin is loaded. The selectors use
		* the sidebar's stable data attributes, never its hashed class names: the New Session button
		* follows the logo row that holds `[data-sidebar-toggle]`, and the global panel list is the
		* scroll viewport's `nav`. The panels stay reachable from the footer utility row.
		*/
		const CHROME_CSS = `
div[data-window-drag]:has([data-sidebar-toggle]) + button,
div[data-window-drag]:has([data-sidebar-toggle]) + div[data-window-drag] + button,
[data-sidebar-scrollport] > nav {
  display: none !important;
}
/* T3's compact top row (Web only; desktop window chrome keeps its own geometry). */
html:not([data-platform]):not([data-windows-titlebar]) div[data-window-drag]:has([data-sidebar-toggle]) {
  height: 40px !important;
  padding-block: 4px !important;
}
`;
		/**
		* T3 `SidebarBrandMark`: a bold short mark and a muted product word, tracking-tight.
		* @returns the brand name.
		*/
		function BrandName({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: Sidebar_module_css_default.brand,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Sidebar_module_css_default.brandMark,
					children: t("brand.mark")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Sidebar_module_css_default.brandName,
					children: t("brand.name")
				})]
			});
		}
		/**
		* T3 `SidebarThreadUndoNotice`: "Settled 2, Undo"; the last text stays while it fades out,
		* then unmounts on transitionend.
		*/
		function UndoNotice({ notice, t }) {
			const summary = notice === null ? null : undoSummary(notice.action, notice.count, t);
			const [shown, setShown] = (0, react.useState)(summary);
			if (summary !== null && summary !== shown) setShown(summary);
			const text = summary ?? shown;
			if (text === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Sidebar_module_css_default.flex1 });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${Sidebar_module_css_default.undo} ${summary === null ? Sidebar_module_css_default.undoHidden : ""}`,
				"aria-hidden": summary === null,
				...summary === null ? { inert: "" } : {},
				"data-testid": "t3-inbox-undo",
				onTransitionEnd: (event) => {
					if (summary === null && event.target === event.currentTarget) setShown(null);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Sidebar_module_css_default.undoButton,
					onClick: () => {
						notice?.undo();
					},
					children: t("undo.button")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [text, t("undo.separator")] })]
			});
		}
		/**
		* T3 `SidebarChromeFooter` utility row: the undo notice fills the free space, and icon
		* buttons open the global panels (Plugins, Automation tasks) the dsh panel list showed.
		* @param props - footer owner share, factory renderer, and the injected share.
		* @returns the row.
		*/
		function FooterUtilities({ t, wide, useNotice, usePanels, usePanelInfo, selectPanel, renderFactorySlot }) {
			const notice = useNotice((value) => value);
			const panels = usePanels((value) => value);
			const activePanel = usePanelInfo((info) => info.activePanelId);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${Sidebar_module_css_default.tokens} ${Sidebar_module_css_default.footerRow} ${wide ? "" : Sidebar_module_css_default.footerRail}`,
				"data-testid": "t3-inbox-footer",
				children: [wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UndoNotice, {
					notice,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Sidebar_module_css_default.footerIcons,
					children: panels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: panel.label,
						side: wide ? "top" : "right",
						delayMs: 150,
						portal: true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": panel.label,
							"aria-current": activePanel === panel.id ? "page" : void 0,
							className: `${Sidebar_module_css_default.headerIcon} ${activePanel === panel.id ? Sidebar_module_css_default.headerIconActive : ""}`,
							onClick: () => {
								selectPanel(panel.id);
							},
							children: renderFactorySlot("sidebar.panel.icon", {
								id: panel.id,
								size: 16,
								active: activePanel === panel.id
							})
						})
					}, panel.id))
				})]
			});
		}
		//#endregion
		//#region src/client/t3/icons.tsx
		function icon(name, children) {
			function LucideIcon(props) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					xmlns: "http://www.w3.org/2000/svg",
					width: "24",
					height: "24",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 2,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": props["aria-label"] === void 0 ? true : void 0,
					"data-lucide": name,
					...props,
					children
				});
			}
			LucideIcon.displayName = name;
			return LucideIcon;
		}
		const BotIcon = icon("bot", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 8V4H8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				width: "16",
				height: "12",
				x: "4",
				y: "8",
				rx: "2"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 14h2" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 14h2" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 13v2" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 13v2" })
		] }));
		const CornerLeftUpIcon = icon("corner-left-up", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 9 9 4 4 9" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 20h-7a4 4 0 0 1-4-4V4" })] }));
		const CircleDotDashedIcon = icon("circle-dot-dashed", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10.1 2.18a9.93 9.93 0 0 1 3.8 0" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21.82 10.1a9.93 9.93 0 0 1 0 3.8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M13.9 21.82a9.94 9.94 0 0 1-3.8 0" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.18 13.9a9.93 9.93 0 0 1 0-3.8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "12",
				cy: "12",
				r: "1"
			})
		] }));
		const CircleDashedIcon = icon("circle-dashed", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7" })
		] }));
		const MessageCircleQuestionIcon = icon("message-circle-question-mark", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17h.01" })
		] }));
		const ShieldQuestionIcon = icon("shield-question-mark", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17h.01" })
		] }));
		const CircleCheckIcon = icon("circle-check", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "10"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 12 2 2 4-4" })] }));
		const AlarmClockIcon = icon("alarm-clock", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "12",
				cy: "13",
				r: "8"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 9v4l2 2" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 3 2 6" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m22 6-3-3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.38 18.7 4 21" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17.64 18.67 20 21" })
		] }));
		const AlarmClockOffIcon = icon("alarm-clock-off", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.87 6.87a8 8 0 1 0 11.26 11.26" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19.9 14.25a8 8 0 0 0-9.15-9.15" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m22 6-3-3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.26 18.67 4 21" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m2 2 20 20" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 4 2 6" })
		] }));
		const Undo2Icon = icon("undo-2", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 14 4 9l5-5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" })] }));
		const CheckIcon = icon("check", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 6 9 17l-5-5" }));
		const ClockIcon = icon("clock", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 6v6l4 2" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "10"
		})] }));
		const SquarePenIcon = icon("square-pen", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" })] }));
		const FolderPlusIcon = icon("folder-plus", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 10v6" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 13h6" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" })
		] }));
		const FolderIcon = icon("folder", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }));
		const SearchIcon = icon("search", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 21-4.34-4.34" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: "11",
			cy: "11",
			r: "8"
		})] }));
		const XIcon = icon("x", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12" })] }));
		const ListFilterIcon = icon("list-filter", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 5h20" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 12h12" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 19h6" })
		] }));
		const ChevronDownIcon = icon("chevron-down", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" }));
		icon("arrow-left", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12 19-7-7 7-7" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 12H5" })] }));
		icon("arrow-right", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 12h14" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12 5 7 7-7 7" })] }));
		const PinIcon = icon("pin", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17v5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" })] }));
		const PinOffIcon = icon("pin-off", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17v5" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m2 2 20 20" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" })
		] }));
		const GitBranchIcon = icon("git-branch", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 6a9 9 0 0 0-9 9V3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "6",
				r: "3"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "6",
				cy: "18",
				r: "3"
			})
		] }));
		const SparkleIcon = icon("sparkle", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" }));
		const PencilIcon = icon("pencil", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 5 4 4" })] }));
		const FolderTreeIcon = icon("folder-tree", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 5a2 2 0 0 0 2 2h3" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 3v13a2 2 0 0 0 2 2h3" })
		] }));
		const TimerIcon = icon("timer", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "10",
				x2: "14",
				y1: "2",
				y2: "2"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "12",
				x2: "15",
				y1: "14",
				y2: "11"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "12",
				cy: "14",
				r: "8"
			})
		] }));
		const CopyIcon = icon("copy", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: "14",
			height: "14",
			x: "8",
			y: "8",
			rx: "2",
			ry: "2"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })] }));
		const HashIcon = icon("hash", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "4",
				x2: "20",
				y1: "9",
				y2: "9"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "4",
				x2: "20",
				y1: "15",
				y2: "15"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "10",
				x2: "8",
				y1: "3",
				y2: "21"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "16",
				x2: "14",
				y1: "3",
				y2: "21"
			})
		] }));
		const ArchiveIcon = icon("archive", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				width: "20",
				height: "5",
				x: "2",
				y: "3",
				rx: "1"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 12h4" })
		] }));
		/**
		* A context-menu glyph at the menu's 16px icon size.
		* @param Component - Lucide icon.
		* @returns component for the `contextMenu.icon` slot.
		*/
		function menuIcon(Component) {
			return function MenuIcon() {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Component, {
					width: 16,
					height: 16
				});
			};
		}
		//#endregion
		//#region src/client/t3/ThreadRow.tsx
		/**
		* Sidebar thread rows: the two-line card (Active, Pinned, Working) and the slim row
		* (Snoozed, Settled), with T3's status pill, hover actions, inline rename, and hover card.
		*
		* Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
		* `apps/web/src/components/sidebar/SidebarThreadRow.tsx` (`SidebarThreadRow`,
		* `SnoozeMenuButton`, `ThreadRenameInput`, `SidebarThreadTooltip`, `TopStatusIcon`,
		* `RelativeTimeLabel`, `WorkingDuration`) and `ThreadHoverCard.tsx`. Tailwind classes
		* become CSS-module classes with the same values; Base UI tooltips and menus become
		* dsh ui-primitives. See PORTING.md for what changed.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
		*/
		function cx$1(...names) {
			return names.filter(Boolean).join(" ");
		}
		/** Re-render when `label(now)` would change, and never in between. */
		function useTickingLabel(label, nextChange) {
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const delay = Math.max(50, nextChange(now) - Date.now());
				const timer = setTimeout(() => {
					setNow(Date.now());
				}, delay);
				return () => {
					clearTimeout(timer);
				};
			}, [now, nextChange]);
			return label(now);
		}
		const nextMinute = (now) => (Math.floor(now / 6e4) + 1) * 6e4;
		/** T3 `RelativeTimeLabel`: compact age that ticks once a minute. */
		function RelativeTimeLabel({ at, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: useTickingLabel((now) => formatRelative(compactRelativeTime(at, now), t), nextMinute) });
		}
		/** T3 `WorkingDuration`: "42s", then "29m"; it re-renders only when its text changes. */
		function WorkingDuration({ startedMs, t }) {
			const next = (now) => {
				const elapsed = now - startedMs;
				return elapsed < 6e4 ? startedMs + (Math.floor(elapsed / 1e3) + 1) * 1e3 : startedMs + (Math.floor(elapsed / 6e4) + 1) * 6e4;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Sidebar_module_css_default.tabular,
				children: useTickingLabel((now) => formatParts(workingDurationParts(now - startedMs), t), next)
			});
		}
		function WakeLabel({ snoozedUntil, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: useTickingLabel((now) => formatRelative(snoozeWakeIn(snoozedUntil, now), t), nextMinute) });
		}
		/** T3's top status, in its precedence order, for the statuses a Harness Session reports. */
		function topStatusOf(row, iconClass, t) {
			const status = (label, icon, tone, woke = false) => ({
				label,
				icon,
				tone: tone ?? "",
				woke
			});
			if (row.status === "working") return status(t("status.working"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleDashedIcon, { className: iconClass }), Sidebar_module_css_default.toneInfo);
			if (row.status === "waiting") return status(t("status.waiting"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleDotDashedIcon, { className: iconClass }), Sidebar_module_css_default.toneMuted);
			if (row.status === "approval") return status(t("status.approval"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShieldQuestionIcon, { className: iconClass }), Sidebar_module_css_default.toneWarning);
			if (row.status === "input") return status(t("status.input"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageCircleQuestionIcon, { className: iconClass }), Sidebar_module_css_default.toneIndigo);
			if (row.isWoke) return status(t("status.woke"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlarmClockIcon, { className: iconClass }), Sidebar_module_css_default.toneWarning, true);
			if (row.unread) return status(t("status.done"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheckIcon, { className: iconClass }), Sidebar_module_css_default.toneSuccess);
			return null;
		}
		/** T3 `ThreadRenameInput`: Enter commits, Escape cancels, blur commits once. */
		function RenameInput({ title, label, onCommit, onCancel }) {
			const [value, setValue] = (0, react.useState)(title);
			const settled = (0, react.useRef)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				autoFocus: true,
				value,
				dir: "auto",
				"aria-label": label,
				className: Sidebar_module_css_default.renameInput,
				onChange: (event) => {
					setValue(event.target.value);
				},
				onFocus: (event) => {
					event.currentTarget.select();
				},
				onClick: (event) => {
					event.stopPropagation();
				},
				onDoubleClick: (event) => {
					event.stopPropagation();
				},
				onKeyDown: (event) => {
					event.stopPropagation();
					if (event.nativeEvent.isComposing) return;
					if (event.key === "Enter") {
						event.preventDefault();
						settled.current = true;
						onCommit(value);
					} else if (event.key === "Escape") {
						event.preventDefault();
						settled.current = true;
						onCancel();
					}
				},
				onBlur: () => {
					if (!settled.current) onCommit(value);
				}
			});
		}
		/** T3 `SnoozeMenuButton`: presets resolve when the menu opens, so each opening reads a fresh time. */
		function SnoozeMenuButton({ open, onOpenChange, onSnooze, onCustom, t }) {
			const [presets, setPresets] = (0, react.useState)(() => resolveSnoozePresets(/* @__PURE__ */ new Date()));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				portal: true,
				align: "end",
				items: [
					...presets.map((preset) => ({
						id: preset.id,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Sidebar_module_css_default.menuPreset,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: presetLabel(preset, t) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Sidebar_module_css_default.menuDetail,
								children: presetWhen(preset, t)
							})]
						})
					})),
					...presets.length > 0 ? [{
						type: "separator",
						id: "sep"
					}] : [],
					{
						id: "custom",
						label: t("snooze.custom")
					}
				],
				onClose: () => {
					onOpenChange(false);
				},
				onSelect: (id) => {
					onOpenChange(false);
					if (id === "custom") {
						onCustom();
						return;
					}
					const picked = pickSnoozePreset(presets, id, /* @__PURE__ */ new Date());
					if (picked !== null) onSnooze(picked.snoozedUntil);
				},
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("action.snooze"),
					side: "top",
					delayMs: 150,
					portal: true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": t("action.snooze"),
						className: Sidebar_module_css_default.snoozeButton,
						onClick: (event) => {
							event.stopPropagation();
							if (!open) setPresets(resolveSnoozePresets(/* @__PURE__ */ new Date()));
							onOpenChange(!open);
						},
						onDoubleClick: (event) => {
							event.stopPropagation();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClockIcon, { className: Sidebar_module_css_default.size3 })
					})
				})
			});
		}
		/** T3 `ProviderInstanceIcon` in its compact sidebar size: the provider's mark, dimmed. */
		function ProviderIcon({ model, className }) {
			if (model === null) return null;
			return model.provider.toLowerCase().includes("deepseek") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FishLogo, {
				size: 14,
				className
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SparkleIcon, {
				className,
				width: 14,
				height: 14
			});
		}
		/** T3 `SidebarThreadTooltip` inside `ThreadHoverCard`. */
		function ThreadDetails({ row }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Sidebar_module_css_default.hoverCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Sidebar_module_css_default.hoverTitle,
					children: row.title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Sidebar_module_css_default.hoverGrid,
					children: [
						row.projectName !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Sidebar_module_css_default.hoverLine,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { className: Sidebar_module_css_default.size3 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Sidebar_module_css_default.hoverValue,
								children: row.projectName
							})]
						}),
						row.branch !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Sidebar_module_css_default.hoverLine,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitBranchIcon, { className: Sidebar_module_css_default.size3 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Sidebar_module_css_default.hoverValue,
								children: row.branch
							})]
						}),
						row.model !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Sidebar_module_css_default.hoverLine,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderIcon, {
								model: row.model,
								className: Sidebar_module_css_default.hoverProvider
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Sidebar_module_css_default.hoverValue,
								children: row.model.model
							})]
						})
					]
				})]
			});
		}
		/**
		* Render one thread row.
		* @param props - row data, variant, selection, and commands.
		* @returns the list item.
		*/
		const ThreadRow = (0, react.memo)(function ThreadRow(props) {
			const { row, variant, isActive, actions, t } = props;
			const [snoozeOpen, setSnoozeOpen] = (0, react.useState)(false);
			const recede = shouldRecede({
				status: row.status,
				isUnread: row.unread,
				isWoke: row.isWoke,
				isActive
			});
			const action = row.section === "snoozed" ? "unsnooze" : row.section === "settled" ? "unsettle" : "settle";
			const showSnooze = canSnooze(row) && action === "settle";
			if (snoozeOpen && !showSnooze) setSnoozeOpen(false);
			const stop = (handler) => (event) => {
				event.preventDefault();
				event.stopPropagation();
				handler();
			};
			const onKeyDown = (event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "F2" && !props.isRenaming) {
					event.preventDefault();
					props.onStartRename(row);
					return;
				}
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				actions.open(row.id);
			};
			const surface = cx$1(Sidebar_module_css_default.rowSurface, action === "unsettle" && !isActive && Sidebar_module_css_default.settledMuted, isActive ? Sidebar_module_css_default.rowActive : recede ? Sidebar_module_css_default.rowRecede : Sidebar_module_css_default.rowIdle, recede && row.status === "working" && Sidebar_module_css_default.rowWorkingRecede);
			const titleClass = variant === "card" ? cx$1(Sidebar_module_css_default.title, recede ? Sidebar_module_css_default.titleRecede : Sidebar_module_css_default.titleStrong) : cx$1(Sidebar_module_css_default.title, Sidebar_module_css_default.titleSlim, recede ? Sidebar_module_css_default.slimRecede : isActive || row.isWoke || row.status === "input" ? Sidebar_module_css_default.slimStrong : row.unread ? Sidebar_module_css_default.slimUnread : Sidebar_module_css_default.slimQuiet, !recede && Sidebar_module_css_default.weightMedium);
			const title = props.isRenaming ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RenameInput, {
				title: row.title,
				label: t("rename.aria"),
				onCommit: (next) => {
					props.onCancelRename();
					const trimmed = next.trim();
					if (trimmed !== "" && trimmed !== row.title) actions.rename(row.id, trimmed);
				},
				onCancel: props.onCancelRename
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": true,
				className: titleClass,
				dir: "auto",
				children: row.title
			});
			const pin = row.pinned && variant === "card" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("action.unpin"),
				side: "bottom",
				delayMs: 150,
				portal: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-label": t("action.unpin"),
					className: Sidebar_module_css_default.unpin,
					onClick: stop(() => {
						actions.unpin(row.id);
					}),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, { className: cx$1(Sidebar_module_css_default.size3, Sidebar_module_css_default.pinOn) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinOffIcon, { className: cx$1(Sidebar_module_css_default.size3, Sidebar_module_css_default.pinOff) })]
				})
			}) : null;
			const common = {
				role: "button",
				tabIndex: 0,
				"data-sidebar-row": row.id,
				"aria-label": row.title,
				"aria-current": isActive ? "page" : void 0,
				onClick: () => {
					actions.open(row.id);
				},
				onDoubleClick: (event) => {
					if (event.target.closest("button, a, input") !== null || props.isRenaming) return;
					event.preventDefault();
					props.onStartRename(row);
				},
				onKeyDown,
				onContextMenu: (event) => {
					event.preventDefault();
					props.onContextMenu(row, {
						x: event.clientX,
						y: event.clientY
					});
				}
			};
			const details = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadDetails, { row });
			if (variant === "slim") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
				className: cx$1(Sidebar_module_css_default.slimItem, props.option?.selected === true && Sidebar_module_css_default.searchActive),
				"data-thread-item": row.id,
				"data-section": row.section,
				...props.option === void 0 ? {} : {
					id: props.option.id,
					role: "option",
					"aria-selected": props.option.selected,
					onMouseEnter: props.option.onHighlight
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
					grouped: true,
					openDelayMs: 150,
					disabled: props.isRenaming,
					content: details,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						...common,
						"data-testid": "sidebar-row-slim",
						className: cx$1(surface, Sidebar_module_css_default.slimRow),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: cx$1(Sidebar_module_css_default.slimIcon, (!isActive || action === "unsettle") && Sidebar_module_css_default.slimIconDim),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { className: Sidebar_module_css_default.size4 })
							}),
							title,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Sidebar_module_css_default.slimTrailing,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: cx$1(Sidebar_module_css_default.slimLabel, !row.isWoke && Sidebar_module_css_default.hideOnRowHover),
									children: action === "unsnooze" && row.record?.snoozedUntil != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: cx$1(Sidebar_module_css_default.wakeLabel, Sidebar_module_css_default.toneInfo),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlarmClockIcon, { className: Sidebar_module_css_default.size3 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WakeLabel, {
											snoozedUntil: row.record.snoozedUntil,
											t
										})]
									}) : row.isWoke ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										"aria-label": t("action.dismissWoke"),
										className: cx$1(Sidebar_module_css_default.wokeButton, Sidebar_module_css_default.toneWarning),
										onClick: stop(() => {
											actions.acknowledgeWoke(row.id);
										}),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlarmClockIcon, { className: Sidebar_module_css_default.size3 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											role: "status",
											children: t("status.woke")
										})]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Sidebar_module_css_default.textXs,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelativeTimeLabel, {
											t,
											at: action === "unsettle" && row.record?.settledAt != null ? Date.parse(row.record.settledAt) : row.activityAt
										})
									})
								}), action === "unsnooze" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("action.wake"),
									side: "top",
									delayMs: 150,
									portal: true,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": t("action.wake"),
										className: cx$1(Sidebar_module_css_default.slimAction, row.isWoke && Sidebar_module_css_default.slimActionStatic),
										onClick: stop(() => {
											actions.unsnooze(row.id);
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlarmClockOffIcon, { className: Sidebar_module_css_default.size3 })
									})
								}) : action === "unsettle" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("action.unsettle"),
									side: "top",
									delayMs: 150,
									portal: true,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": t("action.unsettle"),
										className: cx$1(Sidebar_module_css_default.slimAction, row.isWoke && Sidebar_module_css_default.slimActionStatic),
										onClick: stop(() => {
											actions.unsettle(row.id);
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Undo2Icon, { className: Sidebar_module_css_default.size35 })
									})
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("action.settle"),
									side: "top",
									delayMs: 150,
									portal: true,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": t("action.settle"),
										className: cx$1(Sidebar_module_css_default.slimAction, Sidebar_module_css_default.slimSettle, row.isWoke && Sidebar_module_css_default.slimActionStatic),
										onClick: stop(() => {
											actions.settle(row.id);
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckIcon, { className: Sidebar_module_css_default.size3 })
									})
								})]
							})
						]
					})
				})
			});
			const status = topStatusOf(row, Sidebar_module_css_default.size4, t);
			const providerIcons = row.model === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": true,
				className: Sidebar_module_css_default.metaIcons,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderIcon, {
					model: row.model,
					className: Sidebar_module_css_default.providerIcon
				})
			});
			const metaLine = row.branch === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Sidebar_module_css_default.metaLine,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Sidebar_module_css_default.branch,
					title: row.branch,
					children: row.branch
				}), providerIcons]
			});
			const isWokeStatus = status?.woke === true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
				className: Sidebar_module_css_default.cardItem,
				"data-thread-item": row.id,
				"data-section": row.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
					grouped: true,
					openDelayMs: 150,
					disabled: snoozeOpen || props.isRenaming,
					content: details,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						...common,
						"data-testid": "sidebar-row-card",
						className: surface,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: cx$1(Sidebar_module_css_default.cardContent, metaLine !== null && Sidebar_module_css_default.cardContentTall),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Sidebar_module_css_default.cardTop,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { className: cx$1(Sidebar_module_css_default.size4, Sidebar_module_css_default.projectIcon) }),
										pin,
										row.projectName !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Sidebar_module_css_default.projectName,
											children: row.projectName
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Sidebar_module_css_default.flex1 }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Sidebar_module_css_default.statusSlot,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: cx$1(Sidebar_module_css_default.statusLabel, !isWokeStatus && Sidebar_module_css_default.hideOnRowHover, snoozeOpen && Sidebar_module_css_default.statusHidden),
												children: status === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelativeTimeLabel, {
													t,
													at: row.activityAt
												}) : isWokeStatus ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													"aria-label": t("action.dismissWoke"),
													className: cx$1(Sidebar_module_css_default.wokeButton, status.tone),
													onClick: stop(() => {
														actions.acknowledgeWoke(row.id);
													}),
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlarmClockIcon, { className: Sidebar_module_css_default.size4 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														role: "status",
														children: status.label
													})]
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: cx$1(Sidebar_module_css_default.statusPill, status.tone),
													children: [
														status.icon,
														status.label,
														row.status === "working" && row.runningSince !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															"aria-hidden": true,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkingDuration, {
																startedMs: row.runningSince,
																t
															})
														}) : null
													]
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: cx$1(Sidebar_module_css_default.rowControls, snoozeOpen && Sidebar_module_css_default.rowControlsOpen),
												children: [showSnooze && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SnoozeMenuButton, {
													t,
													open: snoozeOpen,
													onOpenChange: setSnoozeOpen,
													onSnooze: (snoozedUntil) => {
														actions.snooze(row.id, snoozedUntil);
													},
													onCustom: () => {
														actions.requestCustomSnooze(row.id);
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
													label: t("action.settle"),
													side: "top",
													delayMs: 150,
													portal: true,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														"aria-label": t("action.settle"),
														className: Sidebar_module_css_default.settleButton,
														onClick: stop(() => {
															actions.settle(row.id);
														}),
														onDoubleClick: (event) => {
															event.stopPropagation();
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckIcon, { className: Sidebar_module_css_default.size35 }), t("action.settleShort")]
													})
												})]
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Sidebar_module_css_default.cardTitleLine,
									children: [title, metaLine === null ? providerIcons : null]
								}),
								metaLine
							]
						})
					})
				})
			});
		});
		//#endregion
		//#region src/client/t3/Sidebar.tsx
		/**
		* The T3-style thread list that replaces the Workspace browser in `sidebar.workspaces`:
		* the Search header row, Pinned and Active cards, then the collapsible Working,
		* Snoozed, and Settled shelves at the foot of the list.
		*
		* Ported from T3 Code (https://github.com/pingdotgg/t3code, commit 4c8eb1dfd5):
		* the thread list of `apps/web/src/components/Sidebar.tsx`,
		* `sidebar/SidebarThreadHeader.tsx`, `sidebar/SidebarListMarkers.tsx`
		* (`SidebarSectionHeader`), and `ui/collapsible-section-header.tsx`. Drag and drop,
		* project folders, drafts, and jump hints are not ported; see PORTING.md.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc. See ../../logic.ts for the full notice.
		*/
		/** T3 `SETTLED_TAIL_INITIAL_COUNT` and `SETTLED_TAIL_PAGE_COUNT`. */
		const SETTLED_TAIL_INITIAL_COUNT = 10;
		const SETTLED_TAIL_PAGE_COUNT = 25;
		function cx(...names) {
			return names.filter(Boolean).join(" ");
		}
		/** T3 `SidebarHeaderIconButton`. */
		function HeaderIconButton({ label, children, onClick, active, buttonRef }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: "top",
				delayMs: 150,
				portal: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: buttonRef,
					type: "button",
					"aria-label": label,
					className: cx(Sidebar_module_css_default.headerIcon, active && Sidebar_module_css_default.headerIconActive),
					onClick,
					children
				})
			});
		}
		/** T3 `SidebarSectionHeader` over `CollapsibleSectionHeader`. */
		function ShelfHeader({ id, label, count, expanded, onToggle, pushDown }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
				className: cx(Sidebar_module_css_default.shelfItem, pushDown && Sidebar_module_css_default.mtAuto),
				"data-testid": `sidebar-${id}-header`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-expanded": expanded,
					className: Sidebar_module_css_default.shelfButton,
					onClick: onToggle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Sidebar_module_css_default.shelfLabel,
							children: label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							className: Sidebar_module_css_default.shelfRule
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Sidebar_module_css_default.shelfCount,
							children: count
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDownIcon, {
							"aria-hidden": true,
							className: cx(Sidebar_module_css_default.size3, Sidebar_module_css_default.shelfChevron, !expanded && Sidebar_module_css_default.shelfChevronClosed)
						})
					]
				})
			});
		}
		/** A collapsed shelf still shows the open thread (T3 `routeThreadOnly`). */
		function routeOnly(rows, current) {
			return rows.filter((row) => row.id === current);
		}
		/** Rail (collapsed sidebar): the compose and search entry points. */
		function Rail({ actions, expandSidebar, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Sidebar_module_css_default.rail,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderIconButton, {
					label: t("rail.search"),
					onClick: expandSidebar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchIcon, { className: Sidebar_module_css_default.size4 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderIconButton, {
					label: t("header.newThread"),
					onClick: () => {
						actions.newThread();
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SquarePenIcon, { className: Sidebar_module_css_default.size4 })
				})]
			});
		}
		const noSectionScroller = () => ({ bindScrollerRef: void 0 });
		/**
		* Render the thread list.
		* @param props - sidebar owner share, scroller binding, and the injected share.
		* @returns the section.
		*/
		function InboxSidebar(props) {
			const { t, wide, expandSidebar, useSectionScroller, useInbox, useCurrent, usePrefs, useProjects, useRenaming, actions } = props;
			const view = useInbox((value) => value);
			const current = useCurrent((value) => value);
			const prefs = usePrefs((value) => value);
			const projects = useProjects((value) => value);
			const renaming = useRenaming((value) => value);
			const { bindScrollerRef } = (useSectionScroller ?? noSectionScroller)();
			const [query, setQuery] = (0, react.useState)("");
			const [contentMatches, setContentMatches] = (0, react.useState)([]);
			const [activeResult, setActiveResult] = (0, react.useState)(0);
			const [scopeOpen, setScopeOpen] = (0, react.useState)(false);
			const [settledCount, setSettledCount] = (0, react.useState)(SETTLED_TAIL_INITIAL_COUNT);
			const searchInput = (0, react.useRef)(null);
			const root = (0, react.useRef)(null);
			const trimmed = query.trim();
			const searching = trimmed !== "";
			(0, react.useLayoutEffect)(() => {
				const element = root.current;
				const port = element?.closest("[data-sidebar-scrollport]");
				if (element == null || port == null) return;
				const measure = () => {
					const top = element.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
					element.style.setProperty("--t3-fill", `${Math.max(0, port.clientHeight - top)}px`);
				};
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(port);
				return () => {
					observer.disconnect();
				};
			}, [wide]);
			(0, react.useEffect)(() => {
				setContentMatches([]);
				if (!searching) return;
				const controller = new AbortController();
				const timer = setTimeout(() => {
					props.searchContent(trimmed, controller.signal).then(setContentMatches, () => {});
				}, 150);
				return () => {
					clearTimeout(timer);
					controller.abort();
				};
			}, [
				trimmed,
				searching,
				props.searchContent
			]);
			const results = (0, react.useMemo)(() => {
				if (!searching) return [];
				const needle = trimmed.toLocaleLowerCase();
				const all = [
					...view.pinned,
					...view.active,
					...view.working,
					...view.snoozed,
					...view.settled
				];
				const content = new Set(contentMatches);
				return all.filter((row) => row.title.toLocaleLowerCase().includes(needle) || content.has(row.id));
			}, [
				searching,
				trimmed,
				view,
				contentMatches
			]);
			const onContextMenu = (row, point) => {
				props.openMenu({
					kind: "t3Thread",
					value: {
						sessionId: row.id,
						title: row.title
					}
				}, point);
			};
			const rowProps = (row, variant) => ({
				key: row.id,
				t,
				row,
				variant,
				isActive: row.id === current,
				isRenaming: renaming?.sessionId === row.id,
				actions,
				onContextMenu,
				onStartRename: (target) => {
					props.setRenaming({
						sessionId: target.id,
						title: target.title
					});
				},
				onCancelRename: () => {
					props.setRenaming(null);
				}
			});
			if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Rail, {
				actions,
				expandSidebar,
				t
			});
			const onSearchKeyDown = (event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					setQuery("");
					return;
				}
				if (!searching || results.length === 0) return;
				if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					const step = event.key === "ArrowDown" ? 1 : -1;
					setActiveResult((index) => (index + step + results.length) % results.length);
				} else if (event.key === "Enter") {
					event.preventDefault();
					const row = results[Math.min(activeResult, results.length - 1)];
					if (row !== void 0) actions.open(row.id);
				}
			};
			const scoped = projects.filter((project) => prefs.scope.includes(project.id));
			const scopeItems = [
				{
					id: "all",
					label: t("filter.all")
				},
				...projects.length > 0 ? [{
					type: "separator",
					id: "sep"
				}] : [],
				...projects.map((project) => ({
					id: project.id,
					label: project.name,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { className: Sidebar_module_css_default.size4 })
				}))
			];
			const workingRows = prefs.workingExpanded ? view.working : routeOnly(view.working, current);
			const snoozedRows = prefs.snoozedExpanded ? view.snoozed : routeOnly(view.snoozed, current);
			const visibleSettled = view.settled.slice(0, settledCount);
			if (current !== null && !visibleSettled.some((row) => row.id === current)) {
				const open = view.settled.find((row) => row.id === current);
				if (open !== void 0) visibleSettled.push(open);
			}
			const settledRows = prefs.settledExpanded ? visibleSettled : routeOnly(view.settled, current);
			const hiddenSettled = Math.max(0, view.settled.length - visibleSettled.length);
			const total = view.pinned.length + view.active.length + view.working.length + view.snoozed.length + view.settled.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: root,
				className: Sidebar_module_css_default.root,
				"data-testid": "t3-inbox-sidebar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Sidebar_module_css_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Sidebar_module_css_default.searchBox,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchIcon, { className: cx(Sidebar_module_css_default.size4, Sidebar_module_css_default.searchIcon) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: searchInput,
								type: "search",
								className: Sidebar_module_css_default.searchInput,
								value: query,
								placeholder: t("search.placeholder"),
								"aria-label": t("search.aria"),
								role: "combobox",
								"aria-autocomplete": "list",
								"aria-expanded": searching && results.length > 0,
								"aria-controls": searching && results.length > 0 ? "t3-inbox-search-results" : void 0,
								"aria-activedescendant": searching && activeResult < results.length ? `t3-inbox-search-result-${activeResult}` : void 0,
								onChange: (event) => {
									setQuery(event.currentTarget.value);
									setActiveResult(0);
								},
								onKeyDown: onSearchKeyDown
							}),
							searching && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Sidebar_module_css_default.clearSearch,
								"aria-label": t("search.clear"),
								onClick: () => {
									setQuery("");
									searchInput.current?.focus();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(XIcon, { className: Sidebar_module_css_default.size3 })
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Sidebar_module_css_default.headerIcons,
						children: [
							projects.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: scopeOpen,
								portal: true,
								align: "start",
								items: scopeItems,
								selectedIds: prefs.scope.length === 0 ? ["all"] : prefs.scope,
								onClose: () => {
									setScopeOpen(false);
								},
								onSelect: (id) => {
									setScopeOpen(false);
									props.setPrefs({ scope: id === "all" ? [] : [id] });
								},
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderIconButton, {
									label: scoped.length > 0 ? t("filter.ariaActive", { projects: scoped.map((project) => project.name).join(", ") }) : t("filter.aria"),
									active: scoped.length > 0,
									onClick: () => {
										setScopeOpen((open) => !open);
									},
									children: scoped.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { className: Sidebar_module_css_default.size4 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListFilterIcon, { className: Sidebar_module_css_default.size4 })
								})
							}),
							projects.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderIconButton, {
								label: t("header.addProject"),
								onClick: actions.addProject,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderPlusIcon, { className: Sidebar_module_css_default.size4 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderIconButton, {
								label: t("header.newThread"),
								onClick: () => {
									actions.newThread(scoped.length === 1 ? scoped[0]?.id : void 0);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SquarePenIcon, { className: Sidebar_module_css_default.size4 })
							})
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: bindScrollerRef,
					className: Sidebar_module_css_default.listArea,
					"data-sidebar-list-area": "",
					children: searching ? results.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						id: "t3-inbox-search-results",
						role: "listbox",
						"aria-label": t("search.results"),
						className: Sidebar_module_css_default.searchList,
						children: results.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, {
							...rowProps(row, "slim"),
							option: {
								id: `t3-inbox-search-result-${index}`,
								selected: index === activeResult,
								onHighlight: () => {
									setActiveResult(index);
								}
							}
						}))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						className: Sidebar_module_css_default.searchEmpty,
						children: t("search.empty")
					}) : total === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Sidebar_module_css_default.empty,
						children: scoped.length > 1 ? t("empty.projects") : scoped[0] !== void 0 ? t("empty.project", { project: scoped[0].name }) : t("empty.none")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						role: "presentation",
						className: Sidebar_module_css_default.list,
						children: [
							view.pinned.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, { ...rowProps(row, "card") })),
							view.active.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, { ...rowProps(row, "card") })),
							view.working.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShelfHeader, {
								id: "working",
								label: t("shelf.working"),
								count: view.working.length,
								expanded: prefs.workingExpanded,
								pushDown: true,
								onToggle: () => {
									props.setPrefs({ workingExpanded: !prefs.workingExpanded });
								}
							}),
							workingRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, { ...rowProps(row, "card") })),
							view.snoozed.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShelfHeader, {
								id: "snoozed",
								label: t("shelf.snoozed"),
								count: view.snoozed.length,
								expanded: prefs.snoozedExpanded,
								pushDown: view.working.length === 0,
								onToggle: () => {
									props.setPrefs({ snoozedExpanded: !prefs.snoozedExpanded });
								}
							}),
							snoozedRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, { ...rowProps(row, "slim") })),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShelfHeader, {
								id: "settled",
								label: t("shelf.settled"),
								count: view.settled.length,
								expanded: prefs.settledExpanded,
								pushDown: view.working.length + view.snoozed.length === 0,
								onToggle: () => {
									props.setPrefs({ settledExpanded: !prefs.settledExpanded });
									setSettledCount(SETTLED_TAIL_INITIAL_COUNT);
								}
							}),
							settledRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, { ...rowProps(row, "slim") })),
							prefs.settledExpanded && hiddenSettled > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: Sidebar_module_css_default.listItem,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: Sidebar_module_css_default.showMore,
									onClick: () => {
										setSettledCount((count) => count + SETTLED_TAIL_PAGE_COUNT);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDownIcon, {
										"aria-hidden": true,
										className: Sidebar_module_css_default.size4
									}), t("shelf.showMore", { count: Math.min(hiddenSettled, SETTLED_TAIL_PAGE_COUNT) })]
								})
							})
						]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/t3/RelatedThreads.tsx
		/**
		* T3 Code's related-threads list for one thread (https://github.com/pingdotgg/t3code,
		* commit 4c8eb1dfd5, `apps/web/src/components/chat/ThreadRelationshipsControl.tsx`): the
		* "Parent thread" row with `CornerLeftUpIcon` and one `BotIcon` row per subagent with its
		* status. Subagent threads have no sidebar row, so this is how they are reached. dsh has no
		* thread details panel, so the list opens from the Session header's actions band.
		*
		* MIT License — Copyright (c) 2026 T3 Tools Inc.
		*/
		/** T3 `threadRelationshipStatusLabel`, for the states a Session reports. */
		const STATUS_KEY = {
			working: "status.working",
			waiting: "status.waiting",
			approval: "status.approval",
			input: "status.input",
			ready: "status.completed"
		};
		function statusIcon(status) {
			const cls = `${Sidebar_module_css_default.size3} ${Sidebar_module_css_default.shrink0}`;
			switch (status) {
				case "working": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleDashedIcon, { className: `${cls} ${Sidebar_module_css_default.toneInfo}` });
				case "waiting": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleDotDashedIcon, { className: `${cls} ${Sidebar_module_css_default.toneMuted}` });
				case "approval": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShieldQuestionIcon, { className: `${cls} ${Sidebar_module_css_default.toneWarning}` });
				case "input": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageCircleQuestionIcon, { className: `${cls} ${Sidebar_module_css_default.toneIndigo}` });
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheckIcon, { className: `${cls} ${Sidebar_module_css_default.toneSuccess}` });
			}
		}
		function RelatedThreads({ t, useRelations, open }) {
			const relations = useRelations((value) => value);
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			if (relations.parent === null && relations.children.length === 0) return null;
			const items = [];
			if (relations.parent !== null) {
				items.push({
					type: "label",
					id: "parent-label",
					text: t("related.parent")
				});
				items.push({
					id: relations.parent.id,
					label: relations.parent.title,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CornerLeftUpIcon, { className: Sidebar_module_css_default.size4 })
				});
			}
			if (relations.children.length > 0) {
				items.push({
					type: "label",
					id: "subagents-label",
					text: t("related.subagents")
				});
				for (const child of relations.children) items.push({
					id: child.id,
					label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Sidebar_module_css_default.relatedRow,
						"aria-label": t("related.itemAria", {
							title: child.title,
							status: t(STATUS_KEY[child.status])
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Sidebar_module_css_default.relatedTitle,
							children: child.title
						}), statusIcon(child.status)]
					}),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BotIcon, { className: Sidebar_module_css_default.size4 })
				});
			}
			const working = relations.children.filter((child) => child.status === "working").length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: menuOpen,
				portal: true,
				align: "start",
				items,
				onClose: () => {
					setMenuOpen(false);
				},
				onSelect: (id) => {
					setMenuOpen(false);
					open(id);
				},
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Sidebar_module_css_default.relatedTrigger,
					"aria-label": t("related.trigger"),
					"aria-expanded": menuOpen,
					onClick: () => {
						setMenuOpen((value) => !value);
					},
					children: relations.parent !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CornerLeftUpIcon, { className: Sidebar_module_css_default.size3 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Sidebar_module_css_default.relatedTitle,
						children: relations.parent.title
					})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BotIcon, { className: Sidebar_module_css_default.size3 }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relations.children.length }),
						working > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleDashedIcon, { className: `${Sidebar_module_css_default.size3} ${Sidebar_module_css_default.toneInfo}` })
					] })
				})
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Shadows the Workspace browser (priority 0); lower priority renders. */
		const SIDEBAR_PRIORITY = -10;
		/** Services the surfaces need once the Remote is mounted. */
		const UI_SERVICES = [
			"slots",
			"locale",
			"contextMenus",
			"sessions",
			"uiSession",
			"workspaces",
			"layout",
			"uiWorkspace"
		];
		/** Required client services. */
		const inject = ["remote", ...UI_SERVICES];
		/** Dictionary namespace owned by this plugin. */
		const NS = "t3Inbox";
		function registerUi(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en,
				ja,
				es,
				fr,
				de,
				ru,
				pt
			}), "t3-inbox: dictionaries");
			const remote = ctx.remote.inbox;
			const model = new InboxModel(ctx, remote, {
				sessions: ctx.sessions.list,
				status: ctx.uiSession.sessionStatus,
				workspaces: ctx.workspaces.list,
				panel: ctx.layout.panelInfo
			});
			const { actions, customRequest, undoNotice } = createInboxActions(ctx, remote, model);
			const renaming = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			registerThreadMenu(ctx, model, actions, renaming);
			ctx.slots.inject("contextMenu.icon", function* () {
				for (const [key, Component] of [
					[ICON_KEYS.pin, PinIcon],
					[ICON_KEYS.unpin, PinOffIcon],
					[ICON_KEYS.settle, CircleCheckIcon],
					[ICON_KEYS.snooze, ClockIcon],
					[ICON_KEYS.rename, PencilIcon],
					[ICON_KEYS.filter, FolderTreeIcon],
					[ICON_KEYS.autoSettle, TimerIcon],
					[ICON_KEYS.copy, CopyIcon],
					[ICON_KEYS.path, FolderIcon],
					[ICON_KEYS.hash, HashIcon],
					[ICON_KEYS.archive, ArchiveIcon],
					[ICON_KEYS.check, CheckIcon]
				]) yield ctx.slots.register({
					name: "contextMenu.icon",
					key
				}, menuIcon(Component));
			});
			ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				priority: SIDEBAR_PRIORITY,
				locale: NS,
				inject: () => ({
					hooks: {
						inbox: model.view,
						current: model.current,
						prefs: model.prefs,
						projects: model.projects,
						renaming
					},
					actions,
					setPrefs: (patch) => {
						model.setPrefs(patch);
					},
					setRenaming: (request) => {
						renaming.set(request);
					},
					openMenu: (target, point) => {
						ctx.contextMenus.open(target, point);
					},
					searchContent: async (query, signal) => {
						const result = await ctx.sessions.search(query, signal);
						return result.ok ? result.value.items.map((item) => item.sessionId) : [];
					}
				})
			}, InboxSidebar));
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "t3-inbox.related-threads",
				order: 5,
				locale: NS,
				inject: (sessionId) => ({
					hooks: { relations: model.relationsOf(String(sessionId)) },
					open: (id) => {
						actions.open(id);
					}
				})
			}, RelatedThreads));
			ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({
				name: "sidebar.brand.name",
				priority: SIDEBAR_PRIORITY,
				locale: NS
			}, BrandName));
			const panels = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)([]);
			const syncPanels = () => {
				const next = ctx.slots.entriesOfSlot("sidebar.panellist").map(({ options }) => {
					const label = options.label;
					return {
						id: String(options.id),
						order: Number(options.order ?? 0),
						label: typeof label === "function" ? label() : label ?? String(options.id)
					};
				}).sort((left, right) => left.order - right.order).map(({ id, label }) => ({
					id,
					label
				}));
				const previous = panels.getSnapshot();
				if (previous.length === next.length && previous.every((panel, index) => panel.id === next[index]?.id && panel.label === next[index]?.label)) return;
				panels.set(next);
			};
			syncPanels();
			ctx.effect(() => ctx.slots.subscribe("sidebar.panellist", syncPanels), "t3-inbox: panel entries");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "t3-inbox.footer",
				order: -100,
				locale: NS,
				inject: () => ({
					hooks: {
						notice: undoNotice,
						panels
					},
					selectPanel: (id) => {
						ctx.layout.selectPanel(id);
					}
				})
			}, FooterUtilities));
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.t3Inbox = "chrome";
				style.textContent = CHROME_CSS;
				document.head.append(style);
				return () => {
					style.remove();
				};
			}, "t3-inbox: sidebar chrome");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "t3-inbox.custom-snooze",
				locale: NS,
				inject: () => ({
					hooks: { request: customRequest },
					dismiss: () => {
						customRequest.set(null);
					},
					snooze: actions.snooze
				})
			}, CustomSnoozeDialog));
			const onKey = (event) => {
				if (event.key.toLowerCase() !== "z" || event.shiftKey || event.altKey || !(event.ctrlKey || event.metaKey)) return;
				if (event.target?.closest("input, textarea, [contenteditable=\"true\"]") != null) return;
				const current = undoNotice.getSnapshot();
				if (current === null) return;
				event.preventDefault();
				current.undo();
			};
			ctx.effect(() => {
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, "t3-inbox: undo shortcut");
		}
		/**
		* Mount the generated `inbox` Remote, then the surfaces that read it.
		* @param ctx - browser plugin context.
		* @returns disposer withdrawing the surfaces before the Remote.
		*/
		async function apply(ctx) {
			const unmountRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			const ui = ctx.inject(["remote.inbox", ...UI_SERVICES], (scope) => {
				registerUi(scope);
			});
			try {
				await ui;
			} catch (error) {
				await ui.dispose();
				await unmountRemote();
				throw error;
			}
			return async () => {
				await ui.dispose();
				await unmountRemote();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map