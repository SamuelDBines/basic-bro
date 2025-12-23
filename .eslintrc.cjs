// .eslintrc.cjs
/** @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,

	parser: '@typescript-eslint/parser',

	parserOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true, // allow JSX in .ts/.tsx if you want
		},
		// no "project" here = faster / simpler, no type-aware rules
	},

	env: {
		es2022: true,
		node: true,
		browser: true, // both server & client code in same repo
	},

	extends: ['eslint:recommended'],

	// keep it stupid simple
	rules: {
		// let TS handle unused vars mostly; this keeps ESLint from being too noisy
		'no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
			},
		],

		// you probably want console in a framework
		'no-console': 'off',

		// TS types & imports sometimes look "unused" to ESLint; turn this off if it annoys you
		'no-undef': 'off',
	},

	ignorePatterns: ['dist', 'build', 'node_modules'],
};
