import fs from 'node:fs';
import path from 'node:path';
import { p } from './logger';

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.htm': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.mjs': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
};

export interface StaticOptions {
	index?: string;
	fallthrough?: boolean;
	cacheControl?: string;
	mountPath?: string;
	404?: string;
	400?: string;
	502?: string;
}

export interface StaticIndexEntry {
	fsPath: string;
	fileUrl: string;
	size: number;
	mime: string;
}
export interface StaticIndexOptions {
	index?: string;
	mountPath?: string;
	fallthrough?: boolean;
}

type StaticIndex = Map<string, StaticIndexEntry>;

const initValues: StaticOptions = {
	index: 'index.html',
	fallthrough: true,
	cacheControl: 'public, max-age=3600',
	mountPath: '/',
	404: 'errors/404.html',
	400: 'errors/400.html',
	502: 'errors/502.html',
};

export function buildStatic(
	rootDir: string,
	opts: StaticIndexOptions = {}
): StaticIndex {
	const index = new Map<string, StaticIndexEntry>();
	const indexFile = opts.index ?? 'index.html';
	const mountPathRaw = opts.mountPath ?? '/';

	const mountPath =
		mountPathRaw === '/' ? '/' : mountPathRaw.replace(/\/+$/, '') || '/';

	const rootAbs = path.resolve(rootDir);

	function urlJoin(base: string, segment: string): string {
		if (base === '/') return `/${segment}`;
		return `${base}/${segment}`;
	}

	function walk(fsDir: string, urlDir: string) {
		const entries = fs.readdirSync(fsDir, { withFileTypes: true });

		for (const entry of entries) {
			const fsEntryPath = path.join(fsDir, entry.name);

			if (entry.isDirectory()) {
				const nextUrlDir = urlJoin(urlDir, entry.name);
				walk(fsEntryPath, nextUrlDir);
				continue;
			}

			if (!entry.isFile()) continue;

			const stats = fs.statSync(fsEntryPath);
			const ext = path.extname(entry.name).toLowerCase();
			const mime = MIME_TYPES[ext] || 'application/octet-stream';
			const fileUrl =
				urlDir === '/' ? `/${entry.name}` : `${urlDir}/${entry.name}`;

			index.set(fileUrl, {
				fsPath: fsEntryPath,
				fileUrl,
				size: stats.size,
				mime,
			});
			p.log(fileUrl, 'what is file url', fileUrl.replace('.html', ''));
			if (fileUrl.includes('.html')) {
				p.log('Additional index added', fileUrl.replace('.html', ''));
				index.set(fileUrl.replace('.html', ''), {
					fsPath: fsEntryPath,
					size: stats.size,
					fileUrl,
					mime,
				});
			}

			if (entry.name === indexFile) {
				index.set(urlDir, {
					fsPath: fsEntryPath,
					size: stats.size,
					fileUrl,
					mime,
				});
			}
		}
	}

	walk(rootAbs, mountPath);
	return index;
}
