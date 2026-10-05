import assert from "node:assert/strict";
import test from "node:test";
import { pageCount } from "../src/util.js";

test("pageCount returns zero for no items", () => {
	assert.equal(pageCount(0), 0);
});

test("pageCount returns one for a full page", () => {
	assert.equal(pageCount(200), 1);
});

test("pageCount returns the exact number of full pages", () => {
	assert.equal(pageCount(400), 2);
});

test("pageCount counts items immediately around page boundaries", () => {
	assert.equal(pageCount(199), 1);
	assert.equal(pageCount(201), 2);
	assert.equal(pageCount(399), 2);
});

test("pageCount rounds a partial page up", () => {
	assert.equal(pageCount(1), 1);
	assert.equal(pageCount(401), 3);
	assert.equal(pageCount(8641), 44);
});
