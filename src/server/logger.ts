import { Middleware, RequestContext, ResponseContext } from './types';

interface ResLogger {
	log: (...msg: any[]) => void;
	err: (...msg: any[]) => void;
	warn: (...msg: any[]) => void;
}

interface LoggerOptions {
	includeHeaders?: boolean;
	minimal?: boolean;
	log?: (...msg: string[]) => void;
	err?: (...msg: string[]) => void;
	warn?: (...msg: string[]) => void;
}

const isObjectOrArray = (msg: any[]) =>
	msg.map((i) => {
		if (typeof i === 'object' || Array.isArray(i)) return JSON.stringify(i);
		return i;
	});

const loggerHandler: ResLogger = {
	log: (...msg: any[]) =>
		process.stdout.write('[INFO] ' + isObjectOrArray(msg) + '\n'),
	warn: (...msg: any[]) =>
		process.stdout.write('\x1b[33m[WARN] ' + isObjectOrArray(msg) + '\n'),
	err: (...msg: any[]) =>
		process.stderr.write('\x1b[31m[ERR ] ' + isObjectOrArray(msg) + '\n'),
};

export const p = loggerHandler;

type LoggerExtras = { logger: ResLogger };

export const logger =
	(
		options: LoggerOptions = {}
	): Middleware<RequestContext, ResponseContext<LoggerExtras>> =>
	(req, res, next) => {
		const { includeHeaders = false, minimal = false } = options;
		res.logger = {
			err: options.err || loggerHandler.err,
			log: options.log || loggerHandler.log,
			warn: options.warn || loggerHandler.warn,
		};

		const start = process.hrtime.bigint();

		const { method = '-', url = '-' } = req;
		const ip =
			req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

		res.on('finish', () => {
			const end = process.hrtime.bigint();
			const diffNs = Number(end - start);
			const ms = diffNs / 1_000_000;

			const status = res.statusCode;
			const ua = req.headers['user-agent'] || '';

			if (minimal) {
				res.logger.log(`${method} ${url} ${status} ${ms.toFixed(1)}ms`);
				return;
			}

			let line = `[${new Date().toISOString()}] ${ip} ${method} ${url} -> ${status} ${ms.toFixed(
				1
			)}ms`;

			if (ua) {
				line += ` "${ua}"`;
			}

			if (includeHeaders) {
				line += ` headers=${JSON.stringify(req.headers)}`;
			}
			if (status >= 500) {
				res.logger.err(line);
			} else if (status >= 400) {
				res.logger.warn(line);
			} else {
				res.logger.log(line);
			}
		});

		next();
	};
