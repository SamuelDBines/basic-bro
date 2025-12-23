import { describe, it, expect, vi } from 'vitest';
import { createApi } from '../src/api';
import { v } from '../src/index';

import { mockRes } from './helpers';

function makeMockApp() {
	const postCalls: any[] = [];
	const getCalls: any[] = [];

	const app: any = {
		post: vi.fn((path: string, ...handlers: any[]) => {
			postCalls.push({ path, handlers });
		}),
		get: vi.fn((path: string, ...handlers: any[]) => {
			getCalls.push({ path, handlers });
		}),
	};

	return { app, postCalls, getCalls };
}

describe('createApi(app)', () => {
	it('registers route with validate middleware + handler and records metadata', () => {
		const { app, postCalls } = makeMockApp();
		const api = createApi(app);

		const CreateUser = v.object({
			email: v.string().email(),
			name: v.string().min(1),
		});

		const Ok = v.object({ ok: v.boolean() });

		const handler = vi.fn((_req: any, res: any) => res.json({ ok: true }));

		api.post('/users', { body: CreateUser, responses: { 200: Ok } }, handler);

		expect(app.post).toHaveBeenCalledTimes(1);
		expect(postCalls).toHaveLength(1);
		expect(postCalls[0].path).toBe('/users');

		const handlers = postCalls[0].handlers;
		expect(handlers.length).toBe(2);

		const [mw, h] = handlers;
		expect(h).toBe(handler);
		expect(typeof mw).toBe('function');
		expect(mw.length).toBeGreaterThanOrEqual(2);

		const req: any = {
			body: { email: 'nope', name: '' },
			query: {},
			params: {},
		};
		const res = mockRes();
		const next = vi.fn();

		mw(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(400);
		expect(res.body?.error).toBe('VALIDATION_ERROR');

		const routes = api.routes();
		expect(routes).toHaveLength(1);
		expect(routes[0]).toMatchObject({
			method: 'post',
			path: '/users',
		});
		const spec = api.openapi({ title: 'Test', version: '1.0.0' });
		expect(spec.paths['/users']).toBeTruthy();
		expect(spec.paths['/users'].post).toBeTruthy();
		expect(spec.paths['/users'].post.requestBody).toBeTruthy();
		expect(spec.paths['/users'].post.responses['200']).toBeTruthy();
	});
});
