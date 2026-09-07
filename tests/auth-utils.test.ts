import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountDestination,
  displayNameFromAuthMetadata,
  friendlyAuthError,
  initialsForName,
  normalizeEmail,
  normalizeLoginCode,
  prepareOnboardingInput,
  validateEmail,
  validateLoginCode,
} from '../src/lib/auth-utils.ts';

test('normalizes and validates account email addresses', () => {
  assert.equal(normalizeEmail('  Drew.RowNy+Village@GMAIL.com '), 'drew.rowny+village@gmail.com');
  assert.equal(validateEmail('parent@example.com'), null);
  assert.equal(validateEmail(''), 'Add your email address first.');
  assert.equal(validateEmail('missing-domain@'), 'Check that your email address is complete.');
});

test('normalizes pasted one-time codes without changing their content', () => {
  assert.equal(normalizeLoginCode(' 123-456 '), '123456');
  assert.equal(normalizeLoginCode('AB CD'), 'ABCD');
  assert.equal(validateLoginCode('0298-5076'), null);
  assert.match(validateLoginCode('123456') ?? '', /8-digit/i);
  assert.match(validateLoginCode('abcdefgh') ?? '', /8-digit/i);
});

test('reads a safe onboarding name from authentication metadata', () => {
  assert.equal(displayNameFromAuthMetadata({ full_name: '  Drew   Rowny ' }), 'Drew Rowny');
  assert.equal(displayNameFromAuthMetadata({ full_name: 42 }), '');
  assert.equal(displayNameFromAuthMetadata(null), '');
});

test('builds recognizable initials and normalized onboarding values', () => {
  assert.equal(initialsForName('  drew   rowny  '), 'DR');
  assert.deepEqual(
    prepareOnboardingInput({ displayName: '  Test   Parent ', neighborhood: ' Noe   Valley ', tone: 'sage' }),
    { displayName: 'Test Parent', neighborhood: 'Noe Valley', tone: 'sage', initials: 'TP' },
  );
  assert.throws(
    () => prepareOnboardingInput({ displayName: 'A', neighborhood: '', tone: 'peach' }),
    /name your village should know you by/i,
  );
});

test('keeps incomplete accounts in onboarding and preserves invite destinations', () => {
  assert.equal(accountDestination(false), '/(auth)/onboard');
  assert.equal(accountDestination(true), '/(tabs)/buzz');
  assert.equal(accountDestination(false, 'abc 123'), '/(auth)/onboard?invite=abc%20123');
  assert.equal(accountDestination(true, 'abc-123'), '/join/abc-123');
});

test('turns Supabase authentication failures into useful recovery copy', () => {
  assert.match(friendlyAuthError(new Error('Email rate limit exceeded')), /wait a minute/i);
  assert.match(friendlyAuthError({ message: 'Token has expired' }), /send yourself a new one/i);
  assert.match(friendlyAuthError({ message: 'Invalid OTP token' }), /doesn’t look right/i);
  assert.match(friendlyAuthError(new Error('Email address not authorized')), /couldn’t send that code/i);
  assert.match(
    friendlyAuthError({ message: '{"code":"unexpected_failure","status":500}' }),
    /try again in a moment/i,
  );
  assert.match(friendlyAuthError(new Error('Missing identity token')), /Apple couldn’t securely/i);
  assert.match(friendlyAuthError(new TypeError('Network request failed')), /internet/i);
  assert.equal(friendlyAuthError(null, 'Fallback message'), 'Fallback message');
});
