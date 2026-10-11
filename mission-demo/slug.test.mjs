import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases letters', () => {
  assert.equal(slugify('HelloWORLD'), 'helloworld');
});

test('collapses runs of non-alphanumeric characters to one hyphen', () => {
  assert.equal(slugify('hello  ___.../// world'), 'hello-world');
});

test('trims leading and trailing hyphens', () => {
  assert.equal(slugify(' -- Hello World! -- '), 'hello-world');
});

test('preserves digits and existing lowercase alphanumeric text', () => {
  assert.equal(slugify('abc123xyz'), 'abc123xyz');
});

test('returns an empty slug for empty input', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty slug for input containing only separators', () => {
  assert.equal(slugify(' --_!? \t\n'), '');
});

test('keeps already normalized slugs unchanged', () => {
  assert.equal(slugify('hello-world-123'), 'hello-world-123');
});

test('treats accented letters, emoji, non-Latin text and full-width digits as separators', () => {
  assert.equal(slugify('Café💰１２３東京42'), 'caf-42');
});
