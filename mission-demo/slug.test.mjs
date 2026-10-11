import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases letters', () => {
  assert.equal(slugify('HelloWORLD'), 'helloworld');
});

test('preserves alphanumeric characters including digits', () => {
  assert.equal(slugify('abc0123456789xyz'), 'abc0123456789xyz');
});

test('collapses each run of non-alphanumeric characters to one hyphen', () => {
  assert.equal(slugify('hello \t\n___---!!! world / demo'), 'hello-world-demo');
});

test('trims hyphens from both ends', () => {
  assert.equal(slugify(' --Hello World!! '), 'hello-world');
});

test('returns an empty slug for empty or entirely non-alphanumeric text', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(' \t\n_-!? '), '');
});

test('treats non-ASCII letters, digits and emoji as separators', () => {
  assert.equal(slugify('ÉHello🌈World漢字９'), 'hello-world');
  assert.equal(slugify('é漢字🌈９'), '');
});

test('preserves the full ASCII alphabet and digits but excludes adjacent punctuation', () => {
  assert.equal(
    slugify('@ABCDEFGHIJKLMNOPQRSTUVWXYZ[ `abcdefghijklmnopqrstuvwxyz{ /0123456789:'),
    'abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-0123456789',
  );
});
