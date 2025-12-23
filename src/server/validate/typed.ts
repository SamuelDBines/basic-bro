import http from 'node:http';

import { Schema, RequestContext, NextFunction } from './types';

export function withBody<S extends Schema<any>>(
	schema: S,
	handler: (
		req: RequestContext<S>,
		res: http.ServerResponse,
		next: NextFunction
	) => any
) {
	return (
		req: RequestContext<S>,
		res: http.ServerResponse,
		next: NextFunction
	) => handler(req as any, res, next);
}
