import { describe, it, expect } from 'vitest';
import { v } from '../src/index';

describe('object()', () => {
	it('validates shape', () => {
		const User = v.object({
			email: v.string().email(),
			age: v.number().int().positive().optional(),
			tags: v.array(v.string().min(1)).optional(),
			active: v.boolean(),
		});

		const ok = User.validate({ email: 'a@b.com', active: true });
		expect(ok.ok).toBe(true);
		if (ok.ok) {
			expect(ok.value.email).toBe('a@b.com');
			expect(ok.value.age).toBeUndefined();
		}

		expect(User.validate({ email: 'nope', active: true }).ok).toBe(false);
	});

	it('strict() rejects unknown keys', () => {
		const S = v.object({ a: v.string() }).strict();
		const r = S.validate({ a: 'x', extra: 1 });
		expect(r.ok).toBe(false);
	});
});

describe('array()', () => {
	it('validates items + length', () => {
		const A = v.array(v.number().int()).min(2).max(3);

		expect(A.validate([1, 2]).ok).toBe(true);
		expect(A.validate([1]).ok).toBe(false);
		expect(A.validate([1, 2, 3, 4]).ok).toBe(false);
		expect(A.validate([1, 2.2]).ok).toBe(false);
	});
});
