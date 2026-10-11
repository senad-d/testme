import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases text and preserves letters and digits', () => {
  assert.equal(slugify('HeLLo123'), 'hello123');
});

test('collapses each run of non-alphanumeric characters into one hyphen', () => {
  assert.equal(slugify('Hello,   WORLD___42---Done!Next'), 'hello-world-42-done-next');
});

test('trims leading and trailing separators', () => {
  assert.equal(slugify(' -- Hello World!__ '), 'hello-world');
});

test('returns an empty slug for empty or separator-only text', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(' ---_!? \n\t'), '');
});

test('leaves an already normalized slug unchanged', () => {
  assert.equal(slugify('hello-world-42'), 'hello-world-42');
});

test('preserves the full ASCII alphabet and every digit, including single-character slugs', () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  assert.equal(slugify(alphabet.toUpperCase()), alphabet);
  for (const character of alphabet) {
    assert.equal(slugify(character.toUpperCase()), character);
  }
});

test('collapses internal line breaks and Unicode symbols into separators', () => {
  assert.equal(slugify('Alpha\n\t\rBeta 🪙—✨ Gamma'), 'alpha-beta-gamma');
});
