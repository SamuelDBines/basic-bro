import { Issue, Result, Schema } from './types';
import { optional, nullable } from './shared';

export function array<Item>(item: Schema<Item>) {
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
