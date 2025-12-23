import { Schema, Result, Issue } from './types';
import { optional, nullable } from './shared';

type Shape = Record<string, Schema<any>>;

export function object<S extends Shape>(shape: S) {
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
