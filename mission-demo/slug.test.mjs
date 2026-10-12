import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases mixed-case text', () => {
  assert.equal(slugify('MiXeD CaSe'), 'mixed-case');
});

test('collapses each run of non-alphanumeric characters to one hyphen', () => {
  assert.equal(slugify('one  \t\n!!!___two...///three'), 'one-two-three');
});

test('trims leading and trailing separators', () => {
  assert.equal(slugify(' -- Hello World!__ '), 'hello-world');
});

test('preserves lowercase alphanumeric text and digits', () => {
  assert.equal(slugify('abc012xyz9'), 'abc012xyz9');
});

test('preserves an already normalized slug', () => {
  assert.equal(slugify('hello-world-123'), 'hello-world-123');
});

test('preserves single-character letter and digit boundaries', () => {
  for (const [input, expected] of [
    ['!A!', 'a'],
    ['!Z!', 'z'],
    ['!0!', '0'],
    ['!9!', '9'],
  ]) {
    assert.equal(slugify(input), expected);
  }
});

test('treats non-ASCII characters as separators without transliteration', () => {
  assert.equal(slugify('alphaé😀中beta'), 'alpha-beta');
  assert.equal(slugify('é😀中'), '');
});

test('returns an empty slug for empty text', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty slug for text containing only separators', () => {
  assert.equal(slugify(' \t\n--!?_/ '), '');
});
