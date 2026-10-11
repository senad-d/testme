import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases text', () => {
  assert.equal(slugify('HeLLo'), 'hello');
});

test('collapses each run of non-alphanumeric characters to one hyphen', () => {
  assert.equal(slugify('one ,_!\t two\n/three'), 'one-two-three');
});

test('trims leading and trailing hyphens', () => {
  assert.equal(slugify('--- Hello World! ---'), 'hello-world');
});

test('preserves letters and digits', () => {
  assert.equal(slugify('abc0123456789xyz'), 'abc0123456789xyz');
});

test('treats non-ASCII letters, emoji and control characters as separators', () => {
  assert.equal(slugify('\u0000Aé中💰B\u007f'), 'a-b');
  assert.equal(slugify('é中💰'), '');
});

test('excludes punctuation immediately outside the ASCII letter and digit ranges', () => {
  assert.equal(slugify('/09: @AZ[ `az{'), '09-az-az');
});

test('returns an empty slug for empty text', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty slug for text containing only separators', () => {
  assert.equal(slugify(' -_!?\t\n '), '');
});

test('leaves an existing lowercase slug unchanged', () => {
  assert.equal(slugify('hello-world-123'), 'hello-world-123');
});
