import { Transform, TransformOptions, TransformCallback, Readable, Writable } from "stream";
import { EOL } from "os";

export class LineBuffered extends Transform {
	private _buffer = "";
	constructor(options: TransformOptions = {}) {
		super({
			...options,
			decodeStrings: false,
			encoding: "UTF-8"
		});
	}
	_transform(data: any, _: string, callback: TransformCallback): void {
		if (typeof data !== "string") {
			callback(new Error('typeof data !== "string"'));
			return;
		}
		const lines = data.split(EOL);
		if (lines.length > 0) {
			while (lines.length > 1) {
				this.push(this._buffer + lines.shift());
				this._buffer = "";
			}
			this._buffer += lines.shift();
		}
		callback();
	}
	_flush(callback: TransformCallback) {
		this.push(this._buffer);
		callback();
	}
}

export class EolNormalizer extends Transform {
	constructor(options: TransformOptions = {}) {
		super({
			...options,
			decodeStrings: false,
			encoding: "UTF-8"
		});
	}
	_transform(data: any, _: string, callback: TransformCallback): void {
		if (typeof data !== "string") {
			callback(new Error('typeof data !== "string"'));
			return;
		}
		callback(undefined, data.replace(/\r\n|\r|\n/g, EOL));
	}
}

export class RegExpMatcher extends Transform {
	constructor(private readonly _pattern: RegExp, options: TransformOptions = {}) {
		super({
			...options,
			decodeStrings: false,
			readableObjectMode: true
		});
	}
	_transform(data: any, _: string, callback: TransformCallback): void {
		if (typeof data !== "string") {
			callback(new Error('typeof data !== "string"'));
			return;
		}
		const decoded = this._pattern.exec(data);
		if (decoded !== null) {
			callback(undefined, decoded.input);
		} else {
			callback();
		}
	}
}

export class RegExpDecoder<T extends object> extends Transform {
	constructor(private readonly _pattern: RegExp, options: TransformOptions = {}) {
		super({
			...options,
			decodeStrings: false,
			readableObjectMode: true
		});
	}
	_transform(data: any, _: string, callback: TransformCallback): void {
		if (typeof data !== "string") {
			callback(new Error('typeof data !== "string"'));
			return;
		}
		const decoded = this._pattern.exec(data);
		if (decoded !== null) {
			if (decoded.groups !== undefined) {
				callback(undefined, decoded.groups as T);
			} else {
				callback(new Error("Line matched, but no named capture groups were found!"));
			}
		} else {
			callback();
		}
	}
}

export class MapStream<F, T> extends Transform {
	constructor(private readonly _mapFunction: (obj: F) => T, options: TransformOptions = {}) {
		super({
			...options,
			objectMode: true
		});
	}
	_transform(data: F, _: string, callback: TransformCallback): void {
		callback(undefined, this._mapFunction(data));
	}
}

export class FilterStream<T> extends Transform {
	constructor(private readonly _filterFunction: (obj: T) => boolean, options: TransformOptions = {}) {
		super({
			...options,
			objectMode: true
		});
	}
	_transform(data: T, _: string, callback: TransformCallback): void {
		if (this._filterFunction(data)) {
			callback(undefined, data);
		} else {
			callback();
		}
	}
}

export class CsvSink extends Transform {
	private _header: string | null = null;
	constructor(private readonly _delim = ";", options: TransformOptions = {}) {
		super({
			...options,
			writableObjectMode: true,
			encoding: "UTF-8"
		});
	}
	_transform(data: object, _: string, callback: TransformCallback): void {
		if (typeof data !== "object") {
			callback(new Error('typeof data !== "object"'));
			return;
		}
		const header = Object.keys(data).join(this._delim) + EOL;
		if (this._header === null) {
			this._header = header;
			this.push(header);
		} else {
			if (header !== this._header) {
				callback(new Error(`header mismatch: ${header} !== ${this._header}`));
				return;
			}
		}
		const strings = Object.values(data).map(obj => (obj instanceof Date ? obj.toISOString() : obj));
		const csv = strings.join(this._delim) + EOL;
		callback(undefined, csv);
	}
}

export class PlainSink extends Transform {
	constructor(options: TransformOptions = {}) {
		super({
			...options,
			writableObjectMode: true,
			encoding: "UTF-8"
		});
	}
	_transform(data: string, _: string, callback: TransformCallback): void {
		if (typeof data !== "string") {
			callback(new Error('typeof data !== "string"'));
			return;
		}
		callback(undefined, data + EOL);
	}
}

export class JsonSink extends Transform {
	constructor(options: TransformOptions = {}) {
		super({
			...options,
			writableObjectMode: true,
			encoding: "UTF-8"
		});
	}
	_transform(data: any, _: string, callback: TransformCallback): void {
		callback(undefined, JSON.stringify(data) + EOL);
	}
}

export function concat([istream, ...rest]: Readable[], ostream: Writable): void {
	const more = rest.length > 0;
	istream
		.on("end", () => {
			if (more) {
				concat(rest, ostream);
			}
		})
		.pipe(
			ostream,
			{ end: !more }
		);
}

export function streamToArray<T>(stream: Readable): Promise<T[]> {
	return new Promise<T[]>(
		(resolve, reject): void => {
			const res: T[] = [];
			stream.on("data", data => {
				res.push(data);
			});
			stream.on("end", () => {
				resolve(res);
			});
			stream.on("error", reject);
		}
	);
}

export function arrayToStream<T>(array: T[], encoding?: string): Readable {
	let idx = 0;
	return new Readable({
		objectMode: encoding === undefined,
		encoding,
		read(size) {
			for (let count = 0; count < size; count++) {
				if (idx < array.length) {
					if (!this.push(array[idx++])) {
						break;
					}
				} else {
					this.push(null);
				}
			}
		}
	});
}
