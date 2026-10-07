import { readFileSync } from "node:fs";
import { pageSize } from "./util.js";

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));

export function listStock(items) {
	return items.slice(0, pageSize());
}

export function releaseName() {
	return `${config.service}-${config.release.codename}`;
}
