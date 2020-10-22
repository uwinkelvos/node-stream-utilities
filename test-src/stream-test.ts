import { EOL } from "os";
import { promisify } from "util";
import { pipeline, Readable } from "stream";
import { test as Test } from "tap";
import { EolNormalizer, LineBuffered, Collector, concat } from "../lib/stream";
import { range } from "./util";

Test("collector", async (tap): Promise<void> => {
	const expected = [...range(0, 1e4)];
	const collector = new Collector<number>();
	await promisify(pipeline)(
		Readable.from(expected), collector
	);
	const actual = collector.items;
	tap.deepEqual(actual, expected);
});

Test("eol_normalizer", async (tap): Promise<void> => {
	const collector = new Collector<string>();
	await promisify(pipeline)(
		Readable.from(["stuff\r\nmore", "stuff\r", "mostst", "uff\nnomor", "estuff"], { encoding: "UTF-8" }),
		new EolNormalizer(),
		collector
	);
	const expected = [`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"];
	const actual = collector.items
	tap.deepEqual(actual, expected);
});

Test("eol_normalizer", async (tap): Promise<void> => {
	const collector = new Collector<string>();
	await promisify(pipeline)(
		Readable.from([`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"], { encoding: "UTF-8" }),
		new LineBuffered(),
		collector
	);
	const expected = ["stuff", "morestuff", "moststuff", "nomorestuff"];
	const actual = collector.items;
	tap.deepEqual(actual, expected);
});

Test("concat", async (tap): Promise<void> => {
	const expected = [...range(0, 4)];
	const collector = new Collector<number>();
	await promisify(pipeline)(
		concat(Readable.from(expected.slice(0, 2)), Readable.from(expected.slice(2, 4))),
		collector
	);
	const actual = collector.items;
	tap.deepEqual(actual, expected);
});
