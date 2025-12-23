export function compilePath(path: string): {
	pattern: RegExp;
	paramNames: string[];
} {
	const segments = path.split('/').filter(Boolean);

	const paramNames: string[] = [];
	const patternParts = segments.map((segment) => {
		if (segment.startsWith(':')) {
			paramNames.push(segment.slice(1));
			return '([^/]+)';
		}
		return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	});

	const pattern = new RegExp('^/' + patternParts.join('/') + '/?$');
	return { pattern, paramNames };
}

export function normalizePath(p: string): string {
	if (!p.startsWith('/')) p = '/' + p;
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	return p;
}
