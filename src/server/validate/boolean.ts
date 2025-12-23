import type { Result, Schema } from './types';
import { optional, nullable } from './shared';

export function boolean(): Schema<boolean> {
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
