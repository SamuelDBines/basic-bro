import { describe, it, expect } from 'vitest';
import { v } from '../src/index';

describe('boolean()', () => {
	it('Should validate a boolean value', () => {
		const B = v.boolean();
		expect(B.validate('').ok).toBe(false);
		expect(B.validate(false).ok).toBe(true);
		expect(B.validate(true).ok).toBe(true);
		expect(B.validate(1).ok).toBe(false);
		expect(B.validate(null).ok).toBe(false);
		expect(B.validate(undefined).ok).toBe(false);
	});
	it('Should validate a boolean value and allow nullable', () => {
		const B = v.boolean().nullable().optional();
		expect(B.validate('').ok).toBe(false);
		expect(B.validate(false).ok).toBe(true);
		expect(B.validate(true).ok).toBe(true);
		expect(B.validate(1).ok).toBe(false);
		expect(B.validate(null).ok).toBe(true);
		expect(B.validate(undefined).ok).toBe(true);
	});

	it('Shoud generate openapi schema', () => {
		const B = v.boolean().toOpenAPI();
		expect(B).toEqual({ type: 'boolean' });
	});
});
