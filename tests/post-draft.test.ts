import assert from 'node:assert/strict';
import test from 'node:test';
import { preparePostDraft } from '../src/lib/post-draft.ts';

test('switching away from photo never publishes the hidden selected image', () => {
  const image = { uri: 'file://private-family-photo.jpg', base64: 'aW1hZ2U=' };
  assert.equal(preparePostDraft('text', 'tiny win', image).image, null);
  assert.equal(preparePostDraft('question', 'anyone free?', image).image, null);
  assert.throws(() => preparePostDraft('text', ' ', image), /Write a few words/);
  assert.equal(preparePostDraft('photo', ' ', image).image, image);
});

test('memory drafts trim copy and preserve existing photo-with-caption behavior', () => {
  assert.deepEqual(preparePostDraft('photo', ' park day ', null), { type: 'photo', body: 'park day', image: null });
  assert.throws(() => preparePostDraft('photo', ' ', null), /Add a photo/);
});
