// jwtAuth.ts
import crypto from 'node:crypto';
import { Middleware } from './types';

interface JwtAuthOptions {
	headerName?: string;
	scheme?: string;
	required?: boolean;
}

type JwtPayload = Record<string, any>;

function base64UrlDecode(input: string): Buffer {
	input = input.replace(/-/g, '+').replace(/_/g, '/');
	while (input.length % 4 !== 0) input += '=';
	return Buffer.from(input, 'base64');
}

export function jwtAuth(
	secret: string,
	options: JwtAuthOptions = {}
): Middleware {
	const {
		headerName = 'authorization',
		scheme = 'Bearer',
		required = true,
	} = options;

	return (req, res, next) => {
		const header = req.headers[headerName] as string | undefined;
		if (!header) {
			if (required) {
				res.status(401).send('Unauthorized');
				return;
			}
			return next();
		}

		const [prefix, token] = header.split(' ');
		if (!token || prefix !== scheme) {
			if (required) {
				res.status(401).send('Unauthorized');
				return;
			}
			return next();
		}

		const parts = token.split('.');
		if (parts.length !== 3) {
			if (required) {
				res.status(401).send('Unauthorized');
				return;
			}
			return next();
		}

		const [headerB64, payloadB64, sigB64] = parts;
		const data = `${headerB64}.${payloadB64}`;

		const expectedSig = crypto
			.createHmac('sha256', secret)
			.update(data)
			.digest('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');

		if (expectedSig !== sigB64) {
			if (required) {
				res.status(401).send('Unauthorized');
				return;
			}
			return next();
		}

		try {
			const payloadJson = base64UrlDecode(payloadB64).toString('utf8');
			const payload: JwtPayload = JSON.parse(payloadJson);
			(req as any).user = payload; // you can strengthen this with types later
		} catch (e) {
			if (required) {
				res.status(401).send('Unauthorized');
				return;
			}
		}

		next();
	};
}
