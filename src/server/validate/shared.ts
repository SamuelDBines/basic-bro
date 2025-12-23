import { Schema } from './types';

export function optional<T>(inner: Schema<T>): Schema<T | undefined> {
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

export function nullable<T>(inner: Schema<T>): Schema<T | null> {
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
