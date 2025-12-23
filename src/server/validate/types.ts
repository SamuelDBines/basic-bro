import http from 'http';

export enum HttpMethod {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	PATCH = 'patch',
	DELETE = 'delete',
}

export type HttpMethodType = HttpMethod;

export type Issue = {
	path: (string | number)[];
	message: string;
	code: string;
};

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Issue[] };

export interface Schema<T> {
	readonly kind: string;
	validate(input: unknown, path?: (string | number)[]): Result<T>;
	optional(): Schema<T | undefined>;
	nullable(): Schema<T | null>;
	toOpenAPI(): any;
}
export interface BooleanSchema<T> extends Schema<T> {}
// const test: Schema<any> = {
// 	kind: '',
// 	validate:
// }

export type Infer<S> = S extends Schema<infer T> ? T : never;

export interface RequestContext<S> extends http.IncomingMessage {
	pathname: string;
	query: URLSearchParams;
	params: Record<string, string>;
	body?: Infer<S>;
}

export type NextFunction = (err?: unknown) => void;
