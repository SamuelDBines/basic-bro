import esbuild from 'esbuild';

await esbuild
	.build({
		entryPoints: ['src/client/main.ts'],
		outfile: 'dist/client/app.js',
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
