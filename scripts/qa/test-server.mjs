/** Contract checks for the local HTTP fixture, independent of the native driver. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'America/Los_Angeles';
const port = process.env.VILLAGE_QA_TEST_PORT ?? '54330';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], {
  env: { ...process.env, VILLAGE_QA_PORT: port }, stdio: ['ignore', 'pipe', 'pipe'],
});
let accessToken = '';
async function request(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
const id = (n) => `99000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local QA server did not start')), 5000);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Local QA server exited with ${code}`)); });
    child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    child.stderr.on('data', (data) => process.stderr.write(data));
  });
  const unauthenticated = await request('/functions/v1/plan-link-preview', { url: 'https://example.test/summer-camp' });
  assert.equal(unauthenticated.status, 401);
  const auth = await request('/auth/v1/verify', { email: 'parent@example.test', token: '12345678' });
  assert.equal(auth.status, 200);
  assert.equal(auth.data.user.email, 'parent@example.test');
  accessToken = auth.data.access_token;

  const ownerLink = await request('/rest/v1/rpc/get_or_create_plan_invite', { p_plan: id(303) });
  assert.equal(ownerLink.status, 200);
  assert.equal(ownerLink.data.plan_id, id(303));
  assert.equal((await request('/rest/v1/rpc/get_or_create_plan_invite', { p_plan: id(303) })).data.token, ownerLink.data.token);
  const connectedLink = await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(910) });
  assert.equal(connectedLink.data.plan.can_view, true);
  const newLink = await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(911) });
  assert.equal(newLink.data.already_connected, false);
  assert.equal(newLink.data.plan.can_view, false);
  assert.equal((await request('/rest/v1/rpc/redeem_connection_invite', { p_reference: id(911) })).status, 200);
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(911) })).data.plan.can_view, true);
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(912) })).data.plan.can_view, false);
  await request('/rest/v1/rpc/redeem_connection_invite', { p_reference: id(912) });
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(912) })).data.plan.can_view, true);
  await request('/__qa/control', { needsProfile: true });
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(910) })).data.needs_profile, true);
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(910) })).data.plan.can_view, false);
  await request('/rest/v1/rpc/complete_onboarding', { p_display_name: 'Alex Rivera', p_neighborhood: 'Test City' });
  assert.equal((await request('/rest/v1/rpc/preview_connection_invite', { p_reference: id(910) })).data.plan.can_view, true);

  const camp = await request('/functions/v1/plan-link-preview', { url: 'https://example.test/summer-camp?utm_source=qa' });
  assert.equal(camp.status, 200);
  assert.equal(camp.data.startTime, '09:00');
  assert.equal(camp.data.endTime, '15:00');
  assert.equal(new Date(`${camp.data.startDate}T12:00:00`).getDay(), 1);
  assert.equal(new Date(`${camp.data.endDate}T12:00:00`).getDay(), 5);
  const partial = await request('/functions/v1/plan-link-preview', { url: 'https://example.test/partial-camp' });
  assert.equal(partial.status, 200);
  assert.equal(partial.data.startDate, null);
  assert.equal(partial.data.locationName, null);
  assert.ok(partial.data.warnings.length);
  assert.equal((await request('/functions/v1/plan-link-preview', { url: 'https://example.test/unavailable' })).status, 422);
  assert.equal((await request('/functions/v1/plan-link-preview', { url: 'https://example.com/real-site' })).status, 422);
  const duplicate = await request('/functions/v1/plan-link-preview', { url: 'https://example.test/art-club' });
  const matches = await request(`/rest/v1/activities?external_source_key=eq.${encodeURIComponent(duplicate.data.sourceKey)}`);
  assert.equal(matches.data.length, 1);
  assert.equal(matches.data[0].id, id(302));
  const today = await request(`/rest/v1/activities?id=eq.${id(301)}`);
  const localHour = (instant) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(new Date(instant));
  assert.equal(localHour(today.data[0].starts_at), '00');

  const input = {
    p_name: 'Fixture house hangout', p_description: 'Bring snacks', p_emoji: '🏡',
    p_starts_at: null, p_ends_at: null, p_all_day: false,
    p_visibility: 'invited', p_invited_parent_ids: [id(2), id(3)],
    p_location_name: 'Our back garden', p_location_address: 'Meet at the side gate',
    p_external_url: 'https://example.test/birthday', p_external_source_key: null, p_cover_image_url: null,
    p_plan_kind: 'gathering', p_schedule_kind: 'once', p_schedule_days: [], p_schedule_timezone: 'America/Los_Angeles',
  };
  const created = await request('/rest/v1/rpc/create_plan_v3', input);
  assert.equal(created.status, 200);
  const planId = created.data.plan.id;
  assert.equal(created.data.plan.plan_kind, 'gathering');
  assert.equal(created.data.plan.starts_at, null);
  assert.deepEqual(created.data.notified_parent_ids, [id(2), id(3)]);
  const push = await request('/functions/v1/connection-push', { recipientId: id(2), type: 'plan_invite', planId });
  assert.equal(push.status, 200);
  assert.equal(push.data.delivered, 0, 'The fixture records requests without sending remote pushes');
  assert.equal(push.data.qaOnly, true);
  const invitees = await request(`/rest/v1/plan_invites?plan_id=eq.${planId}`);
  assert.deepEqual(invitees.data.map((row) => row.invited_parent_id).sort(), [id(2), id(3)]);
  const shared = await request('/rest/v1/rpc/plan_shared_by', { p_plan_ids: [planId] });
  assert.equal(shared.data[0].parent_id, id(1));
  assert.equal(shared.data[0].display_name, 'Alex Rivera');

  await request('/__qa/control', { fail: ['update_plan_v3:POST'] });
  assert.equal((await request('/rest/v1/rpc/update_plan_v3', { ...input, p_plan: planId, p_name: 'Must not persist' })).status, 503);
  let state = await request('/__qa/state');
  assert.equal(state.data.tables.activities.find((row) => row.id === planId).name, input.p_name);
  await request('/__qa/control', { failAfterMutation: { trigger: 'set_plan_rsvp:POST', fail: ['activities:GET'] } });
  const rsvp = await request('/rest/v1/rpc/set_plan_rsvp', { p_plan: planId, p_state: 'going', p_note: '  Avery and a parent  ' });
  assert.equal(rsvp.status, 200);
  assert.equal(rsvp.data.rsvp_note, 'Avery and a parent');
  assert.equal((await request(`/rest/v1/activities?id=eq.${planId}`)).status, 503);
  state = await request('/__qa/state');
  assert.equal(state.data.tables.activity_interactions.find((row) => row.activity_id === planId).state, 'going');
  assert.equal(state.data.mutations.filter((row) => row.name === 'set_plan_rsvp').length, 1);
  await request('/__qa/control', { fail: [] });
  assert.equal((await request(`/rest/v1/activities?id=eq.${planId}`)).status, 200);
  const omittedNote = await request('/rest/v1/rpc/set_plan_rsvp', { p_plan: planId, p_state: 'interested' });
  assert.equal(omittedNote.data.rsvp_note, 'Avery and a parent');
  const nullNote = await request('/rest/v1/rpc/set_plan_rsvp', { p_plan: planId, p_state: 'going', p_note: null });
  assert.equal(nullNote.data.rsvp_note, 'Avery and a parent');
  const clearedNote = await request('/rest/v1/rpc/set_plan_rsvp', { p_plan: planId, p_state: 'going', p_note: '' });
  assert.equal(clearedNote.data.rsvp_note, null);

  const weekly = await request('/rest/v1/rpc/update_plan_v3', {
    ...input, p_plan: planId, p_plan_kind: 'signup', p_schedule_kind: 'weekly', p_schedule_days: [1, 2, 3, 4, 5],
    p_starts_at: new Date(`${camp.data.startDate}T09:00:00`).toISOString(), p_ends_at: new Date(`${camp.data.endDate}T15:00:00`).toISOString(),
  });
  assert.equal(weekly.status, 200);
  assert.equal(weekly.data.plan.plan_kind, 'signup');
  assert.deepEqual(weekly.data.plan.schedule_days, [1, 2, 3, 4, 5]);
  assert.equal(weekly.data.plan.schedule_timezone, 'America/Los_Angeles');
  assert.equal(localHour(weekly.data.plan.starts_at), '09');
  assert.equal(localHour(weekly.data.plan.ends_at), '15');
  console.log('Local fixture contract checks passed: imports, v3 plans, individual invites, sharer, failures, and persisted RSVP recovery.');
} finally {
  child.kill('SIGTERM');
}
