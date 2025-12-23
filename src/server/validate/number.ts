import type { Issue, Result, Schema } from './types';
import { optional, nullable } from './shared';

type NumMeta = {
	type: 'number' | 'integer';
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
};

export function number(): Schema<number> & {
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
