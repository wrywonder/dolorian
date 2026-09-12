import assert from 'node:assert/strict';
import test from 'node:test';
import { captionPreview, commentLength, prepareCommentBody, reactionCountAfter } from '../src/lib/post-engagement.ts';

test('comments trim surrounding whitespace and reject blank drafts', () => {
  assert.equal(prepareCommentBody('  see you at the park! \n'), 'see you at the park!');
  assert.throws(() => prepareCommentBody(' \n\t '), /Write a comment/);
});

test('comment validation matches the database character limit including emoji', () => {
  assert.equal(commentLength(' 🦖 '), 1);
  assert.equal(prepareCommentBody('🦖'.repeat(1000)), '🦖'.repeat(1000));
  assert.throws(() => prepareCommentBody('a'.repeat(1001)), /1,000 characters/);
  assert.throws(() => prepareCommentBody('🦖'.repeat(1001)), /1,000 characters/);
});

test('reaction changes preserve other reactions and repeated state is idempotent', () => {
  assert.equal(reactionCountAfter(4, false, true), 5);
  assert.equal(reactionCountAfter(5, true, false), 4);
  assert.equal(reactionCountAfter(5, true, true), 5);
  assert.equal(reactionCountAfter(0, true, false), 0);
});

test('photo captions remain readable with expandable long or multiline memories', () => {
  assert.deepEqual(captionPreview('A good day at the park.'), { text: 'A good day at the park.', truncated: false });
  assert.deepEqual(captionPreview('one\ntwo\nthree\nfour'), { text: 'one\ntwo\nthree…', truncated: true });
  assert.deepEqual(captionPreview('🦖'.repeat(181)), { text: `${'🦖'.repeat(180)}…`, truncated: true });
});
