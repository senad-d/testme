import test from 'node:test';
import assert from 'node:assert/strict';
import { pageCount, pageSize } from '../src/util.js';

test('pageSize retains the existing 200-item limit', () => {
	assert.equal(pageSize(), 200);
});

test('pageCount rounds up around the first-page boundary', () => {
	assert.equal(pageCount(1), 1);
	assert.equal(pageCount(199), 1);
	assert.equal(pageCount(201), 2);
});

test('pageCount returns zero for no items', () => {
	assert.equal(pageCount(0), 0);
});

test('pageCount returns one for a full page', () => {
	assert.equal(pageCount(pageSize()), 1);
});

test('pageCount counts an exact multiple of pages', () => {
	assert.equal(pageCount(400), 2);
});

test('pageCount rounds a partial page up', () => {
	assert.equal(pageCount(401), 3);
	assert.equal(pageCount(8641), 44);
});
