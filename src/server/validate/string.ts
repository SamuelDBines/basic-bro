import { Issue, Result, Schema } from './types';
import { optional, nullable } from './shared';

type StringMeta = {
	type: 'string';
	format?: 'email';
	minLength?: number;
	maxLength?: number;
	pattern?: string;
};

export function string(): Schema<string> & {
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
