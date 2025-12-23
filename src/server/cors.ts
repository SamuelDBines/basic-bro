import { Middleware } from './types';

interface CorsOptions {
	origin?: string;
	methods?: string[];
	headers?: string[];
}

const defaultCorsOptions: Required<CorsOptions> = {
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	headers: ['Content-Type', 'Authorization'],
};

export const cors =
	(options: CorsOptions = defaultCorsOptions): Middleware =>
	(req, res, next) => {
		const opts = { ...defaultCorsOptions, ...options };
		res.setHeader('Access-Control-Allow-Origin', opts.origin);
		res.setHeader('Access-Control-Allow-Methods', opts.methods.join(','));
		res.setHeader('Access-Control-Allow-Headers', opts.headers.join(','));
		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}
		next();
	};
