import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import { Name } from '../shared/type';
import {
	HttpMethod,
	RequestContext,
	ResponseContext,
	Middleware,
	SingleHandler,
	Route,
	NextFunction,
	Application,
	Router,
	NestedHandlers,
	RouterHelperArgs,
	handlerArgs,
	MethodDef,
	RouteDocs,
} from './types';
import { compilePath } from './utils';
import { p } from './logger';
import { buildStatic } from './static';
import { openapi, v } from './validate';
import path from 'node:path';

const ob: Name = {
	name: 'Sam server',
};
p.log('Name is', ob);
function attachResponseHelpers<Extras extends object = {}>(
	res: http.ServerResponse
): ResponseContext<Extras> {
	const r = res as ResponseContext<Extras>;

	const send = (...type: string[]) =>
		function (
			this: ResponseContext<Extras>,
			data: string,
			statusCode?: number
		) {
			if (statusCode !== undefined) this.statusCode = statusCode;
			if (!this.getHeader('Content-Type')) {
				this.setHeader('Content-Type', type);
			}
			this.end(data);
		};

	r.status = function (this: ResponseContext<Extras>, code: number) {
		this.statusCode = code;
		return this;
	};

	r.header = function (
		this: ResponseContext<Extras>,
		name: string,
		value: string | string[]
	) {
		this.setHeader(name, value);
		return this;
	};

	r.json = function (
		this: ResponseContext<Extras>,
		body: unknown,
		statusCode?: number
	) {
		if (statusCode !== undefined) this.statusCode = statusCode;
		if (!this.getHeader('Content-Type')) {
			this.setHeader('Content-Type', 'application/json; charset=utf-8');
		}
		const payload = JSON.stringify(body);
		this.end(payload);
	};

	r.html = send('text/html; charset=utf-8');
	r.text = send('text/plain; charset=utf-8');
	r.css = send('text/css; charset=utf-8');
	r.js = send('application/javascript; charset=utf-8');
	r.markup = send('application/markup; charset=utf-8');
	r.csv = send('text/csv; charset=utf-8');

	r.send = function (
		this: ResponseContext<Extras>,
		body: unknown,
		statusCode?: number
	) {
		if (statusCode !== undefined) this.statusCode = statusCode;

		if (body === null || body === undefined) {
			return this.end();
		}

		const currentType = this.getHeader('Content-Type');
		const ct = currentType ? String(currentType).toLowerCase() : '';
		if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
			if (!currentType) {
				this.setHeader('Content-Type', 'application/octet-stream');
			}
			return this.end(body);
		}

		if (typeof body === 'string') return this.text(body, statusCode);

		if (
			typeof body === 'number' ||
			typeof body === 'boolean' ||
			typeof body === 'bigint'
		) {
			if (ct && !ct.includes('application/json')) return this.end(String(body));
			return this.json(body, statusCode);
		}

		if (ct.includes('application/json')) return this.json(body, statusCode);

		return this.end(String(body));
	};

	return r;
}

function isRouter(arg: unknown): arg is Router<any, any, any> {
	return (
		typeof arg === 'object' &&
		arg !== null &&
		Array.isArray((arg as any).routes)
	);
}

const MiddlewareHelper =
	(perRouteMws: Middleware[] = []) =>
	(handler: SingleHandler): SingleHandler => {
		if (perRouteMws.length === 0) return handler;
		return (req, res) => {
			let i = 0;
			const next: NextFunction = (err?: unknown) => {
				if (err) {
					res.status(500).send('Internal Server Error');
					return;
				}
				const mw = perRouteMws[i++];
				if (!mw) {
					return void handler(req, res);
				}
				void Promise.resolve(mw(req, res, next)).catch(next);
			};
			next();
		};
	};

const RouteHelper: RouterHelperArgs =
	(add, addNested) =>
	(method) =>
	(path, ...args) => {
		if (args.length === 0) {
			throw new Error('Route needs at least one handler');
		}
		const last = args[args.length - 1];
		const perRouteMws = args
			.slice(0, -1)
			.filter(
				(a): a is Middleware<any, any, any> =>
					typeof a === 'function' && a.length >= 3
			);
		if (typeof last === 'object') {
			addNested(method, path, last as NestedHandlers, perRouteMws);
			return;
		}
		add(method, path, MiddlewareHelper(perRouteMws)(last as SingleHandler));
		return;
	};

const getFullPath = (base: string, key: string) =>
	base + (key === 'index' ? '' : key.startsWith('/') ? key : `/${key}`);

export const GET = (...handlers: handlerArgs): MethodDef => ({
	method: 'GET',
	handlers,
});

export const POST = (...handlers: handlerArgs): MethodDef => ({
	method: 'POST',
	handlers,
});

export const PUT = (...handlers: handlerArgs): MethodDef => ({
	method: 'PUT',
	handlers,
});

export const PATCH = (...handlers: handlerArgs): MethodDef => ({
	method: 'PATCH',
	handlers,
});

export const DEL = (...handlers: handlerArgs): MethodDef => ({
	method: 'DELETE',
	handlers,
});

export const router = (prefix: string = '', ..._mws: Middleware[]): Router => {
	const middlewares: Middleware[] = _mws;
	const routes: Route[] = [];

	const add = (
		method: HttpMethod,
		path: string,
		handler: SingleHandler,
		docs?: RouteDocs
	) => {
		const fullPath = prefix + path;
		let pattern = undefined,
			paramNames = undefined;
		if (fullPath.includes(':')) {
			const compiledPath = compilePath(fullPath);
			pattern = compiledPath.pattern;
			paramNames = compiledPath.paramNames;
		}
		routes.push({ method, path: fullPath, handler, pattern, paramNames, docs });
		return this;
	};

	function addNested(
		method: HttpMethod,
		basePath: string,
		nested: NestedHandlers,
		perRouteMws: Middleware[] = []
	) {
		for (const [key, value] of Object.entries(nested)) {
			const fullPath = getFullPath(basePath, key);
			const parts = Array.isArray(value)
				? (value as handlerArgs)
				: [value as any];
			const last = parts[parts.length - 1] as SingleHandler;
			const extraMws = parts.slice(0, -1) as Middleware[];

			const allMws = [...perRouteMws, ...extraMws];
			const withMws = MiddlewareHelper(allMws)(last);
			add(method, fullPath, withMws);
		}
	}

	function use(arg: Middleware<any, any, any> | Router<any, any, any>) {
		if (typeof arg === 'function') {
			middlewares.push(arg);
		} else if (isRouter(arg)) {
			for (const r of arg.routes) {
				p.log(r.path);
				add(r.method, r.path, r.handler);
			}
		} else {
			throw new Error('app.use() expects a middleware or a Router');
		}
		return _router;
	}

	const route = RouteHelper(add, addNested);

	const _router = {
		prefix,
		routes,
		use,
		get: route('GET'),
		post: route('POST'),
		put: route('PUT'),
		patch: route('PATCH'),
		del: route('DELETE'),
	};

	return _router;
};

type InitAppOpts = {
	title?: string;
	version?: string;
	routes?: any[];
	docsPath?: string;
	staticPath?: string;
};
const initAppOpts: InitAppOpts = {
	title: 'App',
	version: '1.0.0',
	routes: [],
	docsPath: '/docs',
	staticPath: 'public',
};
export function app(
	opts: InitAppOpts = initAppOpts,
	..._mws: Middleware[]
): Application {
	const middlewares: Middleware[] = _mws;
	const routes: Route[] = [];
	const staticPath: string =
		opts?.staticPath || path.join(__dirname, '..', 'public');
	const docs: InitAppOpts = { ...initAppOpts, ...opts };

	const staticHelper = (file: string, encoding: any = 'utf-8') =>
		fs.readFileSync(path.join(staticPath, file), encoding);
	function use(
		arg: Middleware<any, any, any> | Router<any, any, any>
	): Application {
		if (typeof arg === 'function') {
			middlewares.push(arg);
		} else if (isRouter(arg)) {
			for (const r of arg.routes) {
				add(r.method, r.path, r.handler);
			}
		} else {
			throw new Error('app.use() expects a middleware or a Router');
		}
		return app;
	}

	function add(method: HttpMethod, path: string, handler: SingleHandler) {
		let pattern = undefined,
			paramNames = undefined;
		if (path.includes(':')) {
			const compiledPath = compilePath(path);
			pattern = compiledPath.pattern;
			paramNames = compiledPath.paramNames;
		}
		// const doc = openapi.route({
		// 	method: method as HTTPMethod,
		// 	path,
		// 	requestBody: v.boolean(),
		// 	responses: {},
		// });
		// docs?.routes?.push(doc as never);
		routes.push({ method, path, handler, pattern, paramNames });
	}

	function addNested(
		method: HttpMethod,
		basePath: string,
		nested: NestedHandlers,
		perRouteMws: Middleware[] = []
	) {
		for (const [key, value] of Object.entries(nested)) {
			const fullPath = getFullPath(basePath, key);
			const parts = Array.isArray(value)
				? (value as handlerArgs)
				: [value as any];
			const last = parts[parts.length - 1] as SingleHandler;
			const extraMws = parts.slice(0, -1) as Middleware[];

			const allMws = [...perRouteMws, ...extraMws];
			const withMws = MiddlewareHelper(allMws)(last);
			add(method, fullPath, withMws);
		}
	}

	const route = RouteHelper(add, addNested);

	function findRoute(method: HttpMethod, pathname: string) {
		let route = routes.find(
			(r) => r.method === method && !r.pattern && r.path === pathname
		);
		if (route) {
			return { route, params: {} as Record<string, string> };
		}
		for (const r of routes) {
			if (r.method !== method || !r.pattern) continue;

			const match = pathname.match(r.pattern);
			if (!match) continue;

			const params: Record<string, string> = {};
			r.paramNames!.forEach((name, idx) => {
				params[name] = decodeURIComponent(match[idx + 1] || '');
			});
			return { route: r, params };
		}

		return null;
	}

	const publicStaticIndex = buildStatic(staticPath);

	function handle(req: http.IncomingMessage, res: http.ServerResponse) {
		const r = attachResponseHelpers(res);
		const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host}`);
		const pathname = parsedUrl.pathname;
		const method = (req.method || 'GET').toUpperCase() as HttpMethod;

		const ctx = req as RequestContext;
		ctx.pathname = pathname;
		ctx.query = parsedUrl.searchParams;
		ctx.params = ctx.params ?? {};

		if (docs.docsPath) {
			routes.push({
				method: 'GET',
				path: opts?.docsPath || '/docs',
				handler: (req, res) => {
					r.json(openapi(docs as any));
					return;
				},
			});
		}

		const handler = () => {
			if (r.writableEnded || r.headersSent) {
				return;
			}
			const match = findRoute(method, pathname);
			if (!match) {
				try {
					const publicEntry = publicStaticIndex.get(pathname);
					if (publicEntry) {
						r.header('Content-Type', publicEntry.mime);
						r.send(staticHelper(publicEntry.fileUrl));
						return;
					}
				} catch (err) {
					p.warn('No static files', pathname);
				}
				r.status(404).send('Not Found');
				return;
			}

			ctx.params = match.params;
			void Promise.resolve(match.route.handler(ctx, r)).catch((err) => {
				p.err('Route error:', err);
				r.status(500).send('Internal Server Error');
			});
		};

		MiddlewareHelper(middlewares)(handler)(ctx, r);
	}

	const app: Application = {
		use,
		add,
		get: route('GET'),
		post: route('POST'),
		put: route('PUT'),
		patch: route('PATCH'),
		del: route('DELETE'),
		handle,
	};

	return app;
}

// function group(
// 	basePath: string,
// 	...args: [...AnyMw[], RouteTree]
// ): Router {
// 	if (args.length === 0) {
// 		throw new Error('group needs a tree');
// 	}
// 	const tree = args[args.length - 1] as RouteTree;
// 	const sharedMws = args.slice(0, -1).filter(isMiddleware);

// 	const visit = (pathPrefix: string, node: RouteTree, inheritedMws: AnyMw[]) => {
// 		// handle index
// 		if (node.index) {
// 			registerLeaf(pathPrefix, node.index, inheritedMws);
// 		}

// 		for (const [segment, value] of Object.entries(node)) {
// 			if (segment === 'index' || !value) continue;

// 			const nextPath = pathPrefix + (segment.startsWith('/') ? segment : `/${segment}`);

// 			if (isMethodDef(value) || isMethodMap(value)) {
// 				registerLeaf(nextPath, value as LeafDef, inheritedMws);
// 			} else {
// 				visit(nextPath, value as RouteTree, inheritedMws);
// 			}
// 		}
// 	};

// 	const isMethodMap = (x: any): x is { [k: string]: MethodDef } =>
// 		x && typeof x === 'object' && !isMethodDef(x) &&
// 		Object.values(x).every(isMethodDef);

// 	const registerLeaf = (fullPath: string, leaf: LeafDef, inheritedMws: AnyMw[]) => {
// 		if (isMethodDef(leaf)) {
// 			const { method, handlers } = leaf;
// 			const final = handlers[handlers.length - 1] as AnyHandler;
// 			const mws = [...globalMws, ...inheritedMws, ...handlers.slice(0, -1)];
// 			addRoute(method, fullPath, final, mws);
// 		} else {
// 			for (const [k, def] of Object.entries(leaf)) {
// 				if (!def) continue;
// 				const { method, handlers } = def;
// 				const final = handlers[handlers.length - 1] as AnyHandler;
// 				const mws = [...globalMws, ...inheritedMws, ...handlers.slice(0, -1)];
// 				addRoute(method.toUpperCase() as HttpMethod, fullPath, final, mws);
// 			}
// 		}
// 	};

// 	visit(basePath, tree, sharedMws);
// 	return _router;
// }
