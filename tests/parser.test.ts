// test/env.test.ts
import { describe, it, expect } from 'vitest';
import { parseEnv, config } from '../src/index';
import fs from 'fs';
import path from 'path';

describe('parseEnv', () => {
	it('parses basic key=value pairs', () => {
		const input = `
      FOO=bar
      BAZ=123
    `;
		const parsed = parseEnv(input);

		expect(parsed).toEqual({
			FOO: 'bar',
			BAZ: '123',
		});
	});

	it('ignores comments and blank lines', () => {
		const input = `
      # this is a comment
      FOO=bar

      # another
      BAZ=qux
    `;
		const parsed = parseEnv(input);

		expect(parsed).toEqual({
			FOO: 'bar',
			BAZ: 'qux',
		});
	});

	it('handles quoted values', () => {
		const input = `
      QUOTED="hello world"
      SINGLE='hi there'
    `;
		const parsed = parseEnv(input);

		expect(parsed).toEqual({
			QUOTED: 'hello world',
			SINGLE: 'hi there',
		});
	});
});

describe('config', () => {
	const tmpEnvPath = path.join(__dirname, '.env.test');

	it('loads values into process.env', () => {
		fs.writeFileSync(
			tmpEnvPath,
			`
      FOO=fromfile
      BAR=another
      `,
			'utf8'
		);

		const { parsed, error } = config({ path: tmpEnvPath, override: true });

		expect(error).toBeUndefined();
		expect(parsed.FOO).toBe('fromfile');
		expect(process.env.FOO).toBe('fromfile');
		expect(process.env.BAR).toBe('another');

		fs.unlinkSync(tmpEnvPath);
	});

	it('does not override existing env by default', () => {
		process.env.EXISTING = 'keepme';

		fs.writeFileSync(
			tmpEnvPath,
			`
      EXISTING=fromfile
      `,
			'utf8'
		);

		config({ path: tmpEnvPath });

		expect(process.env.EXISTING).toBe('keepme');

		fs.unlinkSync(tmpEnvPath);
	});
});
