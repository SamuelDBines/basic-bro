// sessions.ts
import crypto from 'node:crypto';
import { Middleware } from './types';
import { p } from './logger';

interface SessionOptions {
	cookieName?: string;
	ttlMs?: number;
}

const sessionStore = new Map<string, { data: any; expiresAt: number }>();

function parseCookies(header: string | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	if (!header) return out;
	const parts = header.split(';');
	for (const part of parts) {
		const [name, ...rest] = part.trim().split('=');
		const value = rest.join('=');
		if (!name) continue;
		out[name] = decodeURIComponent(value || '');
	}
	return out;
}

export function sessions(options: SessionOptions = {}): Middleware {
	const { cookieName = 'sid', ttlMs = 1000 * 60 * 60 * 24 } = options;

	return (req, res, next) => {
		const cookies = parseCookies(req.headers.cookie);
		let sid = cookies[cookieName];

		const now = Date.now();

		if (!sid || !sessionStore.has(sid)) {
			sid = crypto.randomUUID();
			p.log('Sid is: ', sid);
			sessionStore.set(sid, { data: {}, expiresAt: now + ttlMs });

			res.setHeader(
				'Set-Cookie',
				`${cookieName}=${encodeURIComponent(
					sid
				)}; HttpOnly; Path=/; SameSite=Lax`
			);
		}

		const entry = sessionStore.get(sid)!;

		if (entry.expiresAt < now) {
			entry.data = {};
			entry.expiresAt = now + ttlMs;
		}

		(req as any).session = entry.data;

		next();
	};
}
