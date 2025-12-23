import http from 'http';
import { Schema, NextFunction, RequestContext, Issue } from './types';

type Targets = Partial<{
	body?: Schema<any>;
	query?: Schema<any>;
	params?: Schema<any>;
}>;

export function validate<T extends Targets>(targets: T) {
	return (
		req: RequestContext<T>,
		res: http.ServerResponse,
		next: NextFunction
	) => {
		const errors: Issue[] = [];

		if (targets.params) {
			const r = targets.params.validate(req.params, ['params']);
			if (r.ok) req.params = r.value;
			else errors.push(...r.errors);
		}
		if (targets.query) {
			const r = targets.query.validate(req.query, ['query']);
			if (r.ok) req.query = r.value;
			else errors.push(...r.errors);
		}
		if (targets.body) {
			const r = targets.body.validate(req.body, ['body']);
			if (r.ok) req.body = r.value;
			else errors.push(...r.errors);
		}

		if (errors.length) {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'VALIDATION_ERROR', details: errors }));
			return;
		}
		next();
	};
}
