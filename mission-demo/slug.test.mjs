import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from './slug.mjs';

test('lowercases letters', () => {
  assert.equal(slugify('MiXeD'), 'mixed');
});

test('collapses non-alphanumeric runs to single hyphens', () => {
  assert.equal(slugify('one \t_!.-\ntwo'), 'one-two');
});

test('trims leading and trailing hyphens', () => {
  assert.equal(slugify('-- hello --'), 'hello');
});

test('preserves letters and digits in an existing slug', () => {
  assert.equal(slugify('demo-123'), 'demo-123');
});

test('returns an empty slug for empty or separator-only text', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(' --_!\t\n'), '');
});

test('combines lowercase, separator collapse, and edge trimming', () => {
  assert.equal(slugify('  Mission DEMO: Version 2!  '), 'mission-demo-version-2');
});

test('keeps only ASCII letters and digits across character boundaries', () => {
  for (let code = 0; code < 128; code += 1) {
    const character = String.fromCharCode(code);
    const isLetterOrDigit =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    const middle = isLetterOrDigit ? character.toLowerCase() : '-';

    assert.equal(slugify(`a${character}9`), `a${middle}9`, `ASCII code ${code}`);
  }
});

test('treats non-ASCII text as separators rather than transliterating it', () => {
  assert.equal(slugify('AéB東京C💰D'), 'a-b-c-d');
  assert.equal(slugify('é東京💰'), '');
});
