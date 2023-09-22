import { deepEqual } from "node:assert/strict";
import { describe, test } from "node:test";
import { EOL } from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { EolNormalizer, LineBuffered, Collector, concat } from "../stream.js";
import { range, asyncRange } from "./util.js";

describe("collector", () => {
	test("collects readable stream items in array", async (): Promise<void> => {
		const expected = [...range(0, 1e4)];
		const collector = new Collector<number>();
		await pipeline(Readable.from(expected), collector);
		const actual = collector.items;
		deepEqual(actual, expected);
	});
	test("retains empty chunks", async (): Promise<void> => {
		const expected = ["", undefined, ""];
		const collector = new Collector<string | undefined>();
		await pipeline(Readable.from(expected), collector);
		const actual = collector.items;
		deepEqual(actual, expected);
	});
});
describe("EolNormalizerr", () => {
	test("normalizes EOL", async (): Promise<void> => {
		const collector = new Collector<string>();
		await pipeline(
			Readable.from(["stuff\r\nmore", "stuff\r", "mostst", "uff\nnomor", "estuff"], { encoding: "utf-8" }),
			new EolNormalizer(),
			collector
		);
		const expected = [`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"];
		const actual = collector.items;
		deepEqual(actual, expected);
	});
});
describe("LineBuffered", () => {
	test("stream with data chunks for each line", async (): Promise<void> => {
		const collector = new Collector<string>();
		await pipeline(
			Readable.from([`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, `estuff`], {
				encoding: "utf-8",
			}),
			new LineBuffered(),
			collector
		);
		const expected = [`stuff${EOL}`, `morestuff${EOL}`, `moststuff${EOL}`, `nomorestuff`];
		const actual = collector.items;
		deepEqual(actual, expected);
	});
	test("retains empty lines", async (): Promise<void> => {
		const collector = new Collector<string>();
		await pipeline(
			Readable.from([`line1${EOL}${EOL}line2${EOL}`], {
				encoding: "utf-8",
			}),
			new LineBuffered(),
			collector
		);
		const expected = [`line1${EOL}`, `${EOL}`, `line2${EOL}`];
		const actual = collector.items;
		deepEqual(actual, expected);
	});
});
describe("concat", () => {
	test("concats stream without interleaving them", async (): Promise<void> => {
		const expected = [...range(0, 4)];
		const collector = new Collector<number>();
		await pipeline(concat(Readable.from(asyncRange(0, 2)), Readable.from(asyncRange(2, 4))), collector);
		const actual = collector.items;
		deepEqual(actual, expected);
	});
});
