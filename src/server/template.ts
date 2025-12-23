import fs from 'node:fs';
import path from 'node:path';
import {
	SingleHandler,
	RequestContext,
	ResponseContext,
	Middleware,
} from './types';
import { normalizePath } from './utils';

type DataFn = (req: RequestContext) => Record<string, unknown>;
type DefaultData = Record<string, unknown>;

interface HtmlGlobOptions {
	rootDir: string;
	extension?: string;
	mountPath?: string;
	defaultData?: Record<string, unknown>;
}

export interface Template {
	render(data: Record<string, unknown>): string;
}

export interface HtmlHandler extends SingleHandler {
	data: (defaults: DefaultData) => HtmlHandler;
}

export function fileTemplate(filePath: string): Template {
	const abs = path.resolve(filePath);
	return {
		render(data) {
			const raw = fs.readFileSync(abs, 'utf8');
			return interpolate(raw, data);
		},
	};
}

export function stringTemplate(source: string): Template {
	return {
		render(data) {
			return interpolate(source, data);
		},
	};
}

function interpolate(tpl: string, data: Record<string, unknown>): string {
	return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
		const parts = key.split('.');
		let value: any = data;
		for (const p of parts) {
			if (value == null) return '';
			value = value[p];
		}
		return value == null ? '' : String(value);
	});
}

export function html(...templates: Template[]): HtmlHandler {
	let defaultData: DefaultData = {};

	const handler: any = (req: RequestContext, res: ResponseContext) => {
		const dataFromReq: any = (req as any).viewData || {};
		const data = { ...defaultData, ...dataFromReq };

		const htmlParts = templates.map((t) => t.render(data));
		const fullHtml = htmlParts.join('\n');

		res.html(fullHtml);
	};

	handler.data = (defaults: DefaultData): HtmlHandler => {
		defaultData = { ...defaultData, ...defaults };
		return handler;
	};

	return handler as HtmlHandler;
}

export function htmlGlobTemplate(options: HtmlGlobOptions): Middleware {
	const {
		rootDir,
		extension = '.html',
		mountPath = '/',
		defaultData = {},
	} = options;

	const normMount = normalizePath(mountPath);

	return (req: RequestContext, res: ResponseContext, next) => {
		const pathname = req.pathname || '/';

		if (!pathname.startsWith(normMount)) {
			return next();
		}

		let relative = pathname.slice(normMount.length);
		if (relative === '' || relative === '/') relative = '/index';

		if (!relative.endsWith(extension)) relative += extension;

		const filePath = path.join(rootDir, '.' + relative);

		if (!fs.existsSync(filePath)) {
			return next();
		}

		const tpl = fileTemplate(filePath);
		const handler = html(tpl).data(defaultData);

		return handler(req, res);
	};
}

// const layout = fileTemplate(path.join(__dirname, 'views/layout.html'));
// const home = fileTemplate(path.join(__dirname, 'views/home.html'));

// const homePage = html(layout, home).data({
// 	title: 'Welcome',
// });

// app.use(
// 	htmlGlobTemplate({
// 		rootDir: path.join(__dirname, 'views'),
// 		mountPath: '/test',
// 		defaultData: { appName: 'My App' },
// 	})
// );
