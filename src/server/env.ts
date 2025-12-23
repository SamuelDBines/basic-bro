// src/index.ts
import fs from 'fs';
import path from 'path';
export interface LoadEnvOptions {
	path?: string;
	encoding?: BufferEncoding;
	override?: boolean;
	regexMatch?: boolean;
}

export interface ConfigResult {
	parsed: EnvObject;
	error?: Error;
}

export type EnvObject = Record<string, string>;

export function parseEnv(input: string): EnvObject {
	const result: EnvObject = {};

	const lines = input.split(/\r?\n/);

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) continue;

		const eqIndex = line.indexOf('=');
		if (eqIndex === -1) continue;

		const key = line.slice(0, eqIndex).trim();
		let value = line.slice(eqIndex + 1).trim();

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		result[key] = value;
	}

	return result;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
	const value = process.env[key];
	if (value !== undefined) {
		return value;
	}
	if (defaultValue !== undefined) {
		return defaultValue;
	}
	throw new Error(
		`Environment variable ${key} is not set and no default value provided.`
	);
};

export const getStr = (key: string, defaultValue?: string): string =>
	getEnvVar(key, defaultValue);

export const getNum = (key: string, defaultValue?: number): number => {
	const value = getEnvVar(
		key,
		defaultValue !== undefined ? defaultValue.toString() : undefined
	);
	const num = Number(value);
	if (isNaN(num)) {
		throw new Error(`Environment variable ${key} is not a valid number.`);
	}
	return num;
};

export const getBool = (key: string, defaultValue?: boolean): boolean => {
	const value = getEnvVar(
		key,
		defaultValue !== undefined ? defaultValue.toString() : undefined
	);
	return value.toLowerCase() === 'true';
};

// export const getJSON = (key: string, defaultValue: object): object => {
// 	const value = getEnvVar(
// 		key,
// 		defaultValue !== undefined ? defaultValue.toString() : undefined
// 	);
// };

export function config(options: LoadEnvOptions = {}): ConfigResult {
	const filePath = options.path ?? path.resolve(process.cwd(), '.env');
	const encoding = options.encoding ?? 'utf8';
	const override = options.override ?? false;

	try {
		const raw = fs.readFileSync(filePath, { encoding });
		const parsed = parseEnv(raw);

		for (const [key, value] of Object.entries(parsed)) {
			if (override || process.env[key] === undefined) {
				process.env[key] = value;
			}
		}

		return { parsed };
	} catch (err) {
		const error = err as NodeJS.ErrnoException;
		if (error.code === 'ENOENT') {
			return { parsed: {}, error };
		}

		throw error;
	}
}
