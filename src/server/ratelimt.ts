import { Middleware } from './types';

interface RateLimitOptions {
	windowMs?: number;
	max?: number;
	keyPrefix?: string;
}

type RecordKey = string;

interface Bucket {
	count: number;
	resetAt: number;
}

const store = new Map<RecordKey, Bucket>();

export function rateLimit(options: RateLimitOptions = {}): Middleware {
	const { windowMs = 60_000, max = 5, keyPrefix = 'rl:' } = options;

	return (req, res, next) => {
		const ip =
			req.socket.remoteAddress ||
			(req.headers['x-forwarded-for'] as string | undefined) ||
			'unknown';

		const key = `${keyPrefix}${ip}:${req.pathname}`;
		const now = Date.now();

		let bucket = store.get(key);
		if (!bucket || bucket.resetAt <= now) {
			bucket = { count: 0, resetAt: now + windowMs };
		}

		bucket.count++;
		store.set(key, bucket);

		res.header('X-RateLimit-Limit', String(max));
		res.header(
			'X-RateLimit-Remaining',
			String(Math.max(0, max - bucket.count))
		);
		res.header('X-RateLimit-Reset', String(bucket.resetAt));

		if (bucket.count > max) {
			res.status(429).json({
				error: 'Too Many Requests',
				retryAt: new Date(bucket.resetAt).toISOString(),
			});
			return;
		}

		next();
	};
}
