import http from 'http';
import type { Schema } from '@samuelbines/ex-val';

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'OPTIONS'
	| 'HEAD';

interface BaseRequestContext extends http.IncomingMessage {
	pathname: string;
	query: URLSearchParams;
	params: Record<string, string>;
	body?: unknown;
}

type Handler<ReqExtras = any, ResExtras = any> =
	| SingleHandler<ReqExtras, ResExtras>
	| NestedHandlers<ReqExtras, ResExtras>;

type useDef<Err> = Middleware<any, any, Err> | Router<any, any, Err>;

export type RequestContext<ReqExtras = any> = BaseRequestContext & ReqExtras;

export type ResponseContext<ResExtras = any> = http.ServerResponse &
	ResponseHelpers &
	ResExtras;

export type NextFunction<Err = unknown> = (err?: Err) => void;

export type SingleHandler<ReqExtras = any, ResExtras = any> = (
	req: RequestContext<ReqExtras>,
	res: ResponseContext<ResExtras>
) => void | Promise<void>;

export type NestedHandlers<ReqExtras = any, ResExtras = any> = {
	[key: string]: handlerArgs<ReqExtras, ResExtras>;
};

export type Middleware<ReqExtras = any, ResExtras = any, Err = unknown> = (
	req: RequestContext<ReqExtras>,
	res: ResponseContext<ResExtras>,
	next: NextFunction<Err>
) => void | Promise<void>;

export interface RouteDocs {
	summary?: string;
	description?: string;
	tags?: string[];
	requestBody?: Schema<any>;
	responses?: Record<number, Schema<any>>;
}
export interface Route<ReqExtras = any, ResExtras = any> {
	method: HttpMethod;
	path: string;
	handler: SingleHandler<ReqExtras, ResExtras>;
	pattern?: RegExp;
	paramNames?: string[];
	docs?: RouteDocs;
}

export type handlerArgs<ReqExtras = any, ResExtras = any, Err = unknown> = [
	...Middleware<ReqExtras, ResExtras, Err>[],
	Handler<ReqExtras, ResExtras>
];

export interface MethodDef<ReqExtras = any, ResExtras = any, Err = unknown> {
	method: HttpMethod;
	handlers: handlerArgs<ReqExtras, ResExtras, Err>;
}

export type RouterHelperArgs<
	ReqExtras = any,
	ResExtras = any,
	Err = unknown
> = (
	add: (method: HttpMethod, path: string, handler: SingleHandler) => void,
	addNested: (
		method: HttpMethod,
		basePath: string,
		nested: NestedHandlers,
		perRouteMws: Middleware<ReqExtras, ResExtras, Err>[]
	) => void
) => (
	method: HttpMethod
) => (path: string, ...args: handlerArgs<ReqExtras, ResExtras, Err>) => void;

export interface BaseRouter<ReqExtras = any, ResExtras = any, Err = unknown> {
	get: (
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	) => void;
	post: (
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	) => void;
	put: (
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	) => void;
	del: (
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	) => void;
	patch: (
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	) => void;
	use(
		arg: useDef<Err>
	): Application<ReqExtras, ResExtras, Err> | Router<ReqExtras, ResExtras, Err>;
}

export interface Router<ReqExtras = any, ResExtras = any, Err = unknown>
	extends BaseRouter<ReqExtras, ResExtras, Err> {
	prefix: string;
	routes: Route<ReqExtras, ResExtras>[];
	use(mw: useDef<Err>): Router;
}

export interface Application<ReqExtras = any, ResExtras = any, Err = unknown>
	extends BaseRouter<ReqExtras, ResExtras, Err> {
	use(mw: useDef<Err>): Application<ReqExtras, ResExtras, Err>;
	add(
		method: HttpMethod,
		path: string,
		...handlers: handlerArgs<ReqExtras, ResExtras, Err>
	): void;
	handle(req: http.IncomingMessage, res: http.ServerResponse): void;
}

export interface ResponseHelpers {
	status(code: number): this;
	header(name: string, value: string | string[]): this;
	json(body: unknown, statusCode?: number): void;
	html(html: string, statusCode?: number): void;
	text(text: string, statusCode?: number): void;
	send(body: unknown, statusCode?: number): void;
	css(css: string, statusCode?: number): void;
	js(js: string, statusCode?: number): void;
	xml(xml: string, statusCode?: number): void;
	markup(markup: string, statusCode?: number): void;
	csv(csv: string, statusCode?: number): void;
}
