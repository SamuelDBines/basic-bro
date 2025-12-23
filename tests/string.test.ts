import { describe, it, expect } from 'vitest';
import { v } from '../src/index';

describe('string()', () => {
	it('validates email + min/max', () => {
		const S = v.string().email().min(3).max(50);

		expect(S.validate('a@b.com').ok).toBe(true);
		expect(S.validate('x').ok).toBe(false);
		expect(S.validate('not-an-email').ok).toBe(false);
	});

	it('regex()', () => {
		const S = v.string().regex(/^[a-z]+$/);

		expect(S.validate('abc').ok).toBe(true);
		expect(S.validate('abc123').ok).toBe(false);
	});
});
