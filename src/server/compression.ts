import zlib from 'node:zlib';
import { Middleware } from './types';

type Encoding = 'br' | 'gzip' | 'deflate';

interface CompressionOptions {
	encodings?: Encoding[];
	minSize?: number;
}

const defaultCompressionOptions: Required<CompressionOptions> = {
	encodings: ['gzip'],
	minSize: 0,
};

export const compression =
	(options: CompressionOptions = defaultCompressionOptions): Middleware =>
	(req, res, next) => {
		const opts = { ...defaultCompressionOptions, ...options };
		const accept = req.headers['accept-encoding'] || '';
		if (typeof accept !== 'string') return next();

		let encoding: Encoding | null = null;

		if (opts.encodings.includes('br') && /\bbr\b/.test(accept)) encoding = 'br';
		else if (opts.encodings.includes('gzip') && /\bgzip\b/.test(accept))
			encoding = 'gzip';
		else if (opts.encodings.includes('deflate') && /\bdeflate\b/.test(accept))
			encoding = 'deflate';

		if (!encoding) return next();

		let compressor: zlib.BrotliCompress | zlib.Gzip | zlib.Deflate;
		switch (encoding) {
			case 'br':
				compressor = zlib.createBrotliCompress();
				break;
			case 'gzip':
				compressor = zlib.createGzip();
				break;
			case 'deflate':
				compressor = zlib.createDeflate();
				break;
		}

		const origWrite = res.write.bind(res);
		const origEnd = res.end.bind(res);

		res.setHeader('Content-Encoding', encoding);
		res.removeHeader('Content-Length');

		compressor.on('data', (chunk) => {
			origWrite(chunk);
		});
		compressor.on('end', () => {
			origEnd();
		});

		res.write = (chunk: any, encodingArg?: any, cb?: any) => {
			const buffer =
				typeof chunk === 'string'
					? Buffer.from(chunk, encodingArg || 'utf8')
					: typeof chunk === 'object'
					? JSON.stringify(chunk)
					: chunk;
			if (!buffer) return false;
			compressor.write(buffer);
			if (typeof cb === 'function') cb();
			return true;
		};

		res.end = (chunk?: any, encodingArg?: any, cb?: any) => {
			if (chunk) {
				res.write(chunk, encodingArg);
			}
			compressor.end();
			if (typeof cb === 'function') cb();
			return res;
		};

		return next();
	};
