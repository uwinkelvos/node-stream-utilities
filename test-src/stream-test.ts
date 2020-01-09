import Test from "tape";
import { EOL } from "os";
import { pipeline } from "stream";
import { arrayToStream, streamToArray, EolNormalizer, LineBuffered } from "../lib/stream";

Test("array_stream_closed_loop", async function(test) {
	const expected = Array.from({ length: 1e4 }, (_, i) => i);
	const actual = await streamToArray(arrayToStream(expected));
	test.deepEqual(actual, expected);
	test.end();
});

Test("eol_normalizer", async function(test) {
	const stream = pipeline(
		arrayToStream(["stuff\r\nmore", "stuff\r", "mostst", "uff\nnomor", "estuff"], "UTF-8"),
		new EolNormalizer(),
		err => {
			if (err) {
				test.end(err);
			} else {
				test.pass("pipeline should pass!");
			}
		}
	);
	const expected = [`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"];
	const actual = await streamToArray<string>(stream);
	test.deepEqual(actual, expected);
	test.end();
});

Test("eol_normalizer", async function(test) {
	const stream = pipeline(
		arrayToStream([`stuff${EOL}more`, `stuff${EOL}`, "mostst", `uff${EOL}nomor`, "estuff"], "UTF-8"),
		new LineBuffered(),
		err => {
			if (err) {
				test.end(err);
			} else {
				test.pass("pipeline should pass!");
			}
		}
	);
	const expected = ["stuff", "morestuff", "moststuff", "nomorestuff"];
	const actual = await streamToArray<string>(stream);
	test.deepEqual(actual, expected);
	test.end();
});
