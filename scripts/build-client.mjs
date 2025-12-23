import esbuild from 'esbuild';

await esbuild
	.build({
		entryPoints: ['src/client/index.ts'],
		outfile: 'dist/client/index.js',
		bundle: true,
		sourcemap: true,
		minify: process.env.NODE_ENV === 'production',
		logLevel: 'info',
		target: 'es2018',
		format: 'esm',
		loader: {
			'.jsx': 'jsx',
			'.js': 'js',
		},
		jsxFactory: 'h',
		jsxFragment: 'Fragment',
	})
	.catch(() => process.exit(1));
