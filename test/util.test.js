import assert from 'node:assert/strict';
import test from 'node:test';
import { pageCount } from '../src/util.js';

for (const [total, expected] of [
	[0, 0],
	[1, 1],
	[199, 1],
	[200, 1],
	[400, 2],
	[401, 3],
	[8641, 44],
]) {
	test(`pageCount(${total}) returns ${expected}`, () => {
		assert.equal(pageCount(total), expected);
	});
}
