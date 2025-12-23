import { describe, it, expect } from 'vitest';
import { v, openapi, HttpMethod } from '../src/index';

describe('openapi()', () => {
	it('emits basic OpenAPI doc', () => {
		const CreateUser = v.object({
			email: v.string().email(),
			name: v.string().min(1),
		});

		const Ok = v.object({ ok: v.boolean() });

		const doc = openapi({
			title: 'Test',
			version: '1.0.0',
			routes: [
				openapi.route({
					method: HttpMethod.POST,
					path: '/users',
					requestBody: CreateUser,
					responses: { 200: Ok },
				}),
			],
		});

		expect(doc.openapi).toBe('3.1.0');
		expect(doc.paths['/users'].post).toBeTruthy();

		const post = doc.paths['/users'].post;
		expect(post.requestBody.content['application/json'].schema.type).toBe(
			'object'
		);
		expect(post.responses['200'].content['application/json'].schema.type).toBe(
			'object'
		);
	});
});
