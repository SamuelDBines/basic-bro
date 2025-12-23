// src/index.ts
export * from './types';
export * from './validate';
export * from './openapi';
import { string } from './string';
import { number } from './number';
import { boolean } from './boolean';
import { array } from './array';
import { object } from './object';

export { string, number, boolean, array, object };

export const v = { string, number, boolean, array, object } as const;
