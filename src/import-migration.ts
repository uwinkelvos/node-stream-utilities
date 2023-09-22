import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { EolNormalizer, LineBuffered, MapStream } from "./stream.js";

const importLineRegExp = /^(import .+?|})( from ["'])(.+?)(["'];)(\n)$/;
const importNameRelativeRegExp = /^(\.\.?\/?.*?|\/.*?)$/;
const importNameGlobalRegExp = /^(@mobimeo\/node-toolbox\/.+?)$/;

function resolveImportNameRelative(rootpath: string, baseFilePath: string, importName: string): string | null {
	const importPath = path.resolve(rootpath, path.dirname(baseFilePath), importName);

	if (fs.statSync(importPath.replace(/\.js$/, ".ts"), { throwIfNoEntry: false })?.isFile()) {
		return importName;
	}
	if (fs.statSync(importPath + ".ts", { throwIfNoEntry: false })?.isFile()) {
		return importName + ".js";
	}
	if (fs.statSync(importPath, { throwIfNoEntry: false })?.isDirectory) {
		return importName + "/index.js";
	}
	return null;
}

function resolveImportNameGlobal(rootpath: string, _baseFilePath: string, importName: string): string | null {
	const importPath = path.resolve(rootpath, "./node_modules/", importName);

	if (fs.statSync(importPath, { throwIfNoEntry: false })?.isFile()) {
		return importName;
	}
	if (fs.statSync(importPath + ".js", { throwIfNoEntry: false })?.isFile()) {
		return importName + ".js";
	}
	if (fs.statSync(importPath, { throwIfNoEntry: false })?.isDirectory) {
		return importName + "/index.js";
	}
	return null;
}

function resolveImportName(rootpath: string, baseFilePath: string, importName: string): string | null {
	const importNameRelativeMatch = importNameRelativeRegExp.exec(importName);
	if (importNameRelativeMatch) {
		return resolveImportNameRelative(rootpath, baseFilePath, importNameRelativeMatch[1]);
	}

	const importNameGlobalMatch = importNameGlobalRegExp.exec(importName);
	if (importNameGlobalMatch) {
		return resolveImportNameGlobal(rootpath, baseFilePath, importNameGlobalMatch[1]);
	}

	return null;
}

function migrateImportLine(line: string, rootPath: string, baseFilePath: string): string {
	const importLineMatch = importLineRegExp.exec(line); // x(?!\.js|\.json)
	if (!importLineMatch) {
		return line;
	}
	const [, head, from, importName, tail, eol] = importLineMatch;

	const resolvedImportName = resolveImportName(rootPath, baseFilePath, importName);
	if (!resolvedImportName) {
		return line;
	}
	return `${head}${from}${resolvedImportName}${tail}${eol}`;
}

async function main(): Promise<void> {
	const [, , rootPath, ...files] = process.argv;

	if (!fs.existsSync(path.join(rootPath, "package.json"))) {
		throw new Error(`"${rootPath}" must contain package.json`);
	}

	for (const filePath of files) {
		if (!fs.existsSync(filePath)) {
			console.warn(`"${filePath}" does not exist`);
			continue;
		}
		const filePathBak = filePath + ".bak";
		fs.renameSync(filePath, filePathBak);
		await pipeline(
			fs.createReadStream(filePathBak, "utf-8"),
			new EolNormalizer(),
			new LineBuffered(),
			new MapStream((line: string) => migrateImportLine(line, rootPath, filePath)),
			fs.createWriteStream(filePath)
		);
		fs.unlinkSync(filePathBak);
	}
}

main().catch(console.error);
