import { EOL } from "os";
import { promisify } from "util";
import { pipeline, Readable } from "stream";
import { deepEqual } from "assert/strict";
import { suite } from "uvu";
import { EolNormalizer, LineBuffered, Collector, concat } from "../stream";
import { range } from "./util";

const test = suite("stream");
test("collector", async (): Promise<void> => {
	const expected = [...range(0, 1e4)];
	const collector = new Collector<number>();
	await promisify(pipeline)(Readable.from(expected), collector);
	const actual = collector.items;
	deepEqual(actual, expected);
});

test("eol_normalizer", async (): Promise<void> => {
	const collector = new Collector<string>();
	await promisify(pipeline)(
		Readable.from(["stuff\r\nmore", "stuff\r", "mostst", "uff\nnomor", "estuff"], { encoding: "utf-8" }),
		new EolNormalizer(),
		collector
	);
	const expected = [`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"];
	const actual = collector.items;
	deepEqual(actual, expected);
});

test("eol_normalizer", async (): Promise<void> => {
	const collector = new Collector<string>();
	await promisify(pipeline)(
		Readable.from([`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"], { encoding: "utf-8" }),
		new LineBuffered(),
		collector
	);
	const expected = ["stuff", "morestuff", "moststuff", "nomorestuff"];
	const actual = collector.items;
	deepEqual(actual, expected);
});

test("concat", async (): Promise<void> => {
	const expected = [...range(0, 4)];
	const collector = new Collector<number>();
	await promisify(pipeline)(
		concat(Readable.from(expected.slice(0, 2)), Readable.from(expected.slice(2, 4))),
		collector
	);
	const actual = collector.items;
	deepEqual(actual, expected);
});

test.run();
