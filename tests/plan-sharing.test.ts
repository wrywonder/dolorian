import assert from 'node:assert/strict';
import test from 'node:test';
import { inviteNextStep, planInviteMessage, planInviteUrl } from '../src/lib/invite-links.ts';

const inviter = { id: 'owner', display_name: 'Alex', neighborhood: null, avatar_color: 'sage', avatar_initials: 'A', avatar_url: null };
const invitation = { found: true, active: true, inviter, plan: { id: 'plan-id', can_view: false } };

test('plan sharing uses a token-bound HTTPS invitation without a caller-selected destination', () => {
  const url = planInviteUrl(' token ');
  assert.equal(url, 'https://withvillage.app/join/token?plan=1');
  assert.equal(planInviteMessage(' Pizza at ours ', url), `Join me for Pizza at ours! View the plan in Village, or connect with me to see it: ${url}`);
});

test('authorized recipients open their plan even after an invitation expires', () => {
  assert.equal(inviteNextStep({ ...invitation, active: false, plan: { id: 'plan-id', can_view: true } }, true), 'view-plan');
  assert.equal(inviteNextStep({ ...invitation, is_self: true, plan: { id: 'plan-id', can_view: true } }, true), 'view-plan');
});

test('a connection without access must accept the specific private plan invitation', () => {
  assert.equal(inviteNextStep({ ...invitation, already_connected: true }, true), 'accept');
  assert.equal(inviteNextStep({ ...invitation, already_connected: true, active: false }, true), 'expired');
});

test('new friends explicitly accept after sign-in and profile setup', () => {
  assert.equal(inviteNextStep(invitation, false), 'sign-in');
  assert.equal(inviteNextStep({ ...invitation, needs_profile: true }, true), 'onboard');
  assert.equal(inviteNextStep(invitation, true), 'accept');
  assert.equal(inviteNextStep({ ...invitation, plan: { id: 'plan-id', can_view: true } }, false), 'sign-in');
});

test('blocked, deleted, revoked and failed previews do not offer connection acceptance', () => {
  assert.equal(inviteNextStep({ found: false }, true), 'unavailable');
  assert.equal(inviteNextStep(null, true), 'unavailable');
  assert.equal(inviteNextStep({ ...invitation, active: false }, true), 'expired');
});

test('ordinary connection invitations keep their existing destinations', () => {
  assert.equal(inviteNextStep({ ...invitation, plan: null, is_self: true }, true), 'own-invite');
  assert.equal(inviteNextStep({ ...invitation, plan: null, active: false, already_connected: true }, true), 'view-profile');
  assert.equal(inviteNextStep({ ...invitation, plan: null }, true), 'accept');
});
