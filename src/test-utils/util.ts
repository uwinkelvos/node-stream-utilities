import { setImmediate } from "node:timers/promises";

export function* range(min: number, max: number, step = 1): Generator<number> {
	for (let i = min; i < max; i += step) {
		yield i;
	}
}

export async function* asyncRange(min: number, max: number, step = 1): AsyncGenerator<number> {
	for (let i = min; i < max; i += step) {
		await setImmediate();
		yield i;
	}
}
