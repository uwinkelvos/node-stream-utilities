import { promisify } from "util";
import { Readable, pipeline, } from "stream";
import { Collector } from "../lib/stream";
import { asyncRange } from "./util";

async function main(): Promise<void> {
	const stuff = 4;
	const readable = Readable.from(asyncRange(0, 4));
	const collector = new Collector<number>();

	await promisify(pipeline)(readable, collector);
	console.log(collector.items);

	for await (const num of asyncRange(0, 4)) {
		console.log(num);
	}
}

main().catch(console.error);
