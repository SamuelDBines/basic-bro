import { describe, it, expect } from 'vitest';
import { v } from '../src/index';

describe('number()', () => {
	describe('Types: Int, Float, Double', () => {
		it('int', () => {
			const N = v.number().int();
			//Int
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(0).ok).toBe(true);
			expect(N.validate(-5).ok).toBe(true);
			//Not int
			expect(N.validate(10.1).ok).toBe(false);
			expect(N.validate(-3.14).ok).toBe(false);
			expect(N.validate('10').ok).toBe(false);
			expect(N.validate(NaN).ok).toBe(false);
			expect(N.validate(true).ok).toBe(false);
			expect(N.validate(undefined).ok).toBe(false);
			expect(N.validate(null).ok).toBe(false);
			expect(N.validate(Infinity).ok).toBe(false);
			expect(N.validate(-Infinity).ok).toBe(false);
		});

		const doubleOrFloat = (N: any) => {
			// valid: any finite number
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(10.5).ok).toBe(true);
			expect(N.validate(-3.14).ok).toBe(true);
			expect(N.validate(0).ok).toBe(true);
			expect(N.validate(-123456.789).ok).toBe(true);
			expect(N.validate(Number.MAX_VALUE / 2).ok).toBe(true);
			expect(N.validate(Infinity).ok).toBe(true);
			expect(N.validate(-Infinity).ok).toBe(true);

			// invalid: non-numbers
			expect(N.validate('10').ok).toBe(false);
			expect(N.validate(NaN).ok).toBe(false);
		};
		it('float', () => {
			doubleOrFloat(v.number().float());
		});

		it('double', () => {
			doubleOrFloat(v.number().double());
		});
	});

	// Postive + Negative
	describe('Types: Int, Float, Double', () => {
		it('int', () => {
			const N = v.number().int();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(true);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(false);
		});

		it('float', () => {
			const N = v.number().float();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(true);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(true);
		});

		it('double', () => {
			const N = v.number().double();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(true);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(true);
		});

		it('int + positive', () => {
			const N = v.number().int().positive();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(false);
		});

		it('float + positive', () => {
			const N = v.number().float().positive();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(true);
		});

		it('double + positive', () => {
			const N = v.number().double().positive();
			expect(N.validate(1).ok).toBe(true);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(true);
		});

		it('int + negative', () => {
			const N = v.number().int().negative();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(false);
		});

		it('float + negative', () => {
			const N = v.number().float().negative();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(false);
			expect(N.validate(-1.2).ok).toBe(true);
		});

		it('double + negative', () => {
			const N = v.number().double().negative();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(true);
			expect(N.validate(1.2).ok).toBe(false);
			expect(N.validate(-1.2).ok).toBe(true);
		});

		// Should never be true.
		it('int + postive/negative', () => {
			const N = v.number().int().negative().positive();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(false);
		});

		it('float + postive/negative', () => {
			const N = v.number().float().negative().positive();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(false);
		});
		it('double + postive/negative', () => {
			const N = v.number().double().negative().positive();
			expect(N.validate(1).ok).toBe(false);
			expect(N.validate(0).ok).toBe(false);
			expect(N.validate(-1).ok).toBe(false);
			expect(N.validate(1.2).ok).toBe(false);
		});
	});
	// min + max
	describe('min + max', () => {
		it('int + min', () => {
			const N = v.number().int().min(10);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(10.1).ok).toBe(false);
			expect(N.validate(21).ok).toBe(true);
			expect(N.validate(9).ok).toBe(false);
			expect(N.validate(-100).ok).toBe(false);
		});
		it('float + min', () => {
			const N = v.number().float().min(10);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(10.1).ok).toBe(true);
			expect(N.validate(21).ok).toBe(true);
			expect(N.validate(9).ok).toBe(false);
			expect(N.validate(-100).ok).toBe(false);
		});

		it('double + min', () => {
			const N = v.number().float().min(10);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(10.1).ok).toBe(true);
			expect(N.validate(21).ok).toBe(true);
			expect(N.validate(9).ok).toBe(false);
			expect(N.validate(-100).ok).toBe(false);
		});

		it('int + max', () => {
			const N = v.number().int().max(10);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(21).ok).toBe(false);
			expect(N.validate(9).ok).toBe(true);
			expect(N.validate(-100).ok).toBe(true);
		});

		it('min/max', () => {
			const N = v.number().min(10).max(20);
			expect(N.validate(10).ok).toBe(true);
			expect(N.validate(21).ok).toBe(false);
		});
	});
});
