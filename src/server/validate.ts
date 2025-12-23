import http from 'http';
import {
	Schema,
	RequestContext,
	ResponseContext,
	Result,
	Issue,
	HttpMethod,
	SingleHandler,
	Middleware,
} from './types';

// private Types

type NumMeta = {
	type: 'number' | 'integer';
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
};

type Targets = Partial<{
	body?: Schema<any>;
	query?: Schema<any>;
	params?: Schema<any>;
}>;

type Shape = Record<string, Schema<any>>;

type StringMeta = {
	type: 'string';
	format?: 'email';
	minLength?: number;
	maxLength?: number;
	pattern?: string;
};

type Route = {
	method: HttpMethod;
	path: string;
	requestBody: Schema<any>;
	params: Schema<any>;
	responses: Record<number, Schema<any>>;
};

type OpenapiOptions = {
	title: string;
	version: string;
	routes: Route[];
};

// Private
function optional<T>(inner: Schema<T>): Schema<T | undefined> {
	return {
		kind: `${inner.kind}.optional`,
		validate(input, path = []) {
			return input === undefined
				? { ok: true, value: undefined }
				: inner.validate(input, path);
		},
		optional() {
			return this;
		},
		nullable() {
			return nullable(this);
		},
		toOpenAPI() {
			return inner.toOpenAPI();
		},
	};
}

function nullable<T>(inner: Schema<T>): Schema<T | null> {
	return {
		kind: `${inner.kind}.nullable`,
		validate(input, path = []) {
			return input === null
				? { ok: true, value: null }
				: inner.validate(input, path);
		},
		optional() {
			return optional(this);
		},
		nullable() {
			return this;
		},
		toOpenAPI() {
			return { anyOf: [inner.toOpenAPI(), { type: 'null' }] };
		},
	};
}

function boolean(): Schema<boolean> {
	const self: any = {
		kind: 'boolean',
		validate(input: unknown, path: (string | number)[] = []): Result<boolean> {
			if (typeof input !== 'boolean') {
				return {
					ok: false,
					errors: [{ path, code: 'type', message: 'Expected boolean' }],
				};
			}
			return { ok: true, value: input };
		},
		optional() {
			return optional(self);
		},
		nullable() {
			return nullable(self);
		},
		toOpenAPI() {
			return { type: 'boolean' };
		},
	};

	return self;
}

function number(): Schema<number> & {
	min(n: number): any;
	max(n: number): any;
	positive(): any;
	negative(): any;
	int(): any;
	float(): any;
	double(): any;
} {
	const meta: NumMeta = { type: 'number' };
	const checks: ((n: number) => Issue | null)[] = [];

	const self: any = {
		kind: 'number',

		validate(input: unknown, path: (string | number)[] = []): Result<number> {
			if (typeof input !== 'number' || Number.isNaN(input)) {
				return {
					ok: false,
					errors: [{ path, code: 'type', message: 'Expected number' }],
				};
			}

			const errors: Issue[] = [];
			for (const c of checks) {
				const issue = c(input);
				if (issue) errors.push({ ...issue, path });
			}

			return errors.length ? { ok: false, errors } : { ok: true, value: input };
		},

		min(n: number) {
			meta.minimum = n;
			checks.push((v) =>
				v < n ? { path: [], code: 'min', message: `Min ${n}` } : null
			);
			return self;
		},

		max(n: number) {
			meta.maximum = n;
			checks.push((v) =>
				v > n ? { path: [], code: 'max', message: `Max ${n}` } : null
			);
			return self;
		},

		positive() {
			meta.exclusiveMinimum = 0;
			checks.push((v) =>
				v > 0 ? null : { path: [], code: 'positive', message: 'Must be > 0' }
			);
			return self;
		},

		negative() {
			meta.exclusiveMaximum = 0;
			checks.push((v) =>
				v < 0 ? null : { path: [], code: 'negative', message: 'Must be < 0' }
			);
			return self;
		},

		int() {
			meta.type = 'integer';
			checks.push((v) =>
				Number.isInteger(v)
					? null
					: { path: [], code: 'int', message: 'Must be integer' }
			);
			return self;
		},

		float() {
			return self;
		},
		double() {
			return self;
		},

		optional() {
			return optional(self);
		},
		nullable() {
			return nullable(self);
		},

		toOpenAPI() {
			return { ...meta };
		},
	};

	return self;
}

function object<S extends Shape>(shape: S) {
	let isStrict = false;

	const schema: Schema<{ [K in keyof S]: any }> & {
		strict(): any;
	} = {
		kind: 'object',

		validate(input: unknown, path: any[] = []): Result<any> {
			if (typeof input !== 'object' || input === null || Array.isArray(input)) {
				return {
					ok: false,
					errors: [{ path, code: 'type', message: 'Expected object' }],
				};
			}

			const obj: any = input;
			const out: any = {};
			const errors: Issue[] = [];

			if (isStrict) {
				for (const k of Object.keys(obj)) {
					if (!(k in shape)) {
						errors.push({
							path: [...path, k],
							code: 'unknown',
							message: 'Unknown key',
						});
					}
				}
			}

			for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
				const schema = shape[key];
				const r = schema?.validate(obj[key], [...path, key]);
				if (r)
					if (r.ok) out[key] = r.value;
					else errors.push(...r?.errors);
			}

			return errors.length ? { ok: false, errors } : { ok: true, value: out };
		},

		optional() {
			return optional(schema as any);
		},
		nullable() {
			return nullable(schema as any);
		},

		strict() {
			isStrict = true;
			return schema;
		},

		toOpenAPI() {
			const properties: any = {};
			const required: string[] = [];

			for (const [k, s] of Object.entries(shape)) {
				properties[k] = s.toOpenAPI();
				if (!String(s.kind).includes('.optional')) required.push(k);
			}

			const o: any = { type: 'object', properties };
			if (required.length) o.required = required;
			if (isStrict) o.additionalProperties = false;
			return o;
		},
	};

	return schema as any;
}

function string(): Schema<string> & {
	min(n: number): any;
	max(n: number): any;
	length(n: number): any;
	regex(re: RegExp): any;
	email(): any;
} {
	const meta: StringMeta = { type: 'string' };
	const checks: ((s: string) => Issue | null)[] = [];

	const self: any = {
		kind: 'string',

		validate(input: unknown, path: any[] = []): Result<string> {
			const errors: Issue[] = [];
			if (typeof input !== 'string') {
				return {
					ok: false,
					errors: [{ path, code: 'type', message: 'Expected string' }],
				};
			}
			for (const c of checks) {
				const issue = c(input);
				if (issue) errors.push({ ...issue, path });
			}
			return errors.length ? { ok: false, errors } : { ok: true, value: input };
		},

		min(n: number) {
			meta.minLength = n;
			checks.push((s) =>
				s.length < n
					? { path: [], code: 'min', message: `Min length ${n}` }
					: null
			);
			return self;
		},
		max(n: number) {
			meta.maxLength = n;
			checks.push((s) =>
				s.length > n
					? { path: [], code: 'max', message: `Max length ${n}` }
					: null
			);
			return self;
		},
		length(n: number) {
			meta.minLength = n;
			meta.maxLength = n;
			checks.push((s) =>
				s.length !== n
					? { path: [], code: 'length', message: `Length ${n}` }
					: null
			);
			return self;
		},
		regex(re: RegExp) {
			meta.pattern = re.source;
			checks.push((s) =>
				re.test(s)
					? null
					: { path: [], code: 'pattern', message: 'Invalid format' }
			);
			return self;
		},
		email() {
			meta.format = 'email';
			const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			meta.pattern = meta.pattern ?? re.source;
			checks.push((s) =>
				re.test(s)
					? null
					: { path: [], code: 'email', message: 'Invalid email' }
			);
			return self;
		},

		optional() {
			return optional(self);
		},
		nullable() {
			return nullable(self);
		},

		toOpenAPI() {
			return { ...meta };
		},
	};

	return self;
}

function array<Item>(item: Schema<Item>) {
	let minItems: number | undefined;
	let maxItems: number | undefined;

	const schema: any = {
		kind: 'array',

		validate(input: unknown, path: (string | number)[] = []): Result<Item[]> {
			if (!Array.isArray(input)) {
				return {
					ok: false,
					errors: [{ path, code: 'type', message: 'Expected array' }],
				};
			}

			const errors: Issue[] = [];

			if (minItems !== undefined && input.length < minItems) {
				errors.push({
					path,
					code: 'minItems',
					message: `Min items ${minItems}`,
				});
			}
			if (maxItems !== undefined && input.length > maxItems) {
				errors.push({
					path,
					code: 'maxItems',
					message: `Max items ${maxItems}`,
				});
			}

			const out: Item[] = [];
			input.forEach((val, i) => {
				const r = item.validate(val, [...path, i]);
				if (r.ok) out.push(r.value);
				else errors.push(...r.errors);
			});

			return errors.length ? { ok: false, errors } : { ok: true, value: out };
		},

		min(n: number) {
			minItems = n;
			return schema;
		},
		max(n: number) {
			maxItems = n;
			return schema;
		},
		length(n: number) {
			minItems = n;
			maxItems = n;
			return schema;
		},

		optional() {
			return optional(schema);
		},
		nullable() {
			return nullable(schema);
		},

		toOpenAPI() {
			const o: any = { type: 'array', items: item.toOpenAPI() };
			if (minItems !== undefined) o.minItems = minItems;
			if (maxItems !== undefined) o.maxItems = maxItems;
			return o;
		},
	};

	return schema as Schema<Item[]> & {
		min(n: number): any;
		max(n: number): any;
		length(n: number): any;
	};
}

export function validate<T extends Targets>(targets: T): Middleware {
	return (req, res, next) => {
		const errors: Issue[] = [];

		if (targets.params) {
			const r = targets.params.validate(req.params, ['params']);
			if (r.ok) req.params = r.value;
			else errors.push(...r.errors);
		}
		if (targets.query) {
			const r = targets.query.validate(req.query, ['query']);
			if (r.ok) req.query = r.value;
			else errors.push(...r.errors);
		}
		if (targets.body) {
			const r = targets.body.validate(req.body, ['body']);
			if (r.ok) req.body = r.value;
			else errors.push(...r.errors);
		}

		if (errors.length) {
			res
				.status(400)
				.json(JSON.stringify({ error: 'VALIDATION_ERROR', details: errors }));
			return;
		}
		next();
	};
}

export const openapi = (opts: OpenapiOptions) => {
	const paths: any = {};

	for (const r of opts.routes) {
		paths[r.path] ??= {};
		paths[r.path][r.method] = {
			responses: Object.fromEntries(
				Object.entries(r.responses).map(([code, schema]) => [
					code,
					{
						description: 'Response',
						content: { 'application/json': { schema: schema.toOpenAPI() } },
					},
				])
			),
			...(r.requestBody
				? {
						requestBody: {
							required: true,
							content: {
								'application/json': { schema: r.requestBody.toOpenAPI() },
							},
						},
				  }
				: {}),
		};
	}

	return {
		openapi: '3.1.0',
		info: { title: opts.title, version: opts.version },
		paths,
	};
};

openapi.route = (r: Route) => r;

// export { string, number, boolean, array, object }; //Keep private for now

export const v = { string, number, boolean, array, object } as const;

export function withBody<S extends Schema<any>>(
	schema: S,
	handler: SingleHandler<S, S>
) {
	return (req: RequestContext<S>, res: ResponseContext<S>) => handler(req, res);
}
