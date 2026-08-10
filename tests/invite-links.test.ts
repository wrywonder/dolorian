import assert from 'node:assert/strict';
import test from 'node:test';
import { connectionInviteMessage, connectionInviteUrl } from '../src/lib/invite-links.ts';

test('builds a stable HTTPS invite link for messaging apps', () => {
  assert.equal(
    connectionInviteUrl('  abc 123  '),
    'https://withvillage.app/join/abc%20123',
  );
});

test('share copy explains the private connection and includes the link', () => {
  const url = connectionInviteUrl('ABC12345');
  const message = connectionInviteMessage(url);
  assert.match(message, /private parent village/i);
  assert.match(message, /https:\/\/withvillage\.app\/join\/ABC12345/);
});
