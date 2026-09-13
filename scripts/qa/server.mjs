/** Local-only, explicit test double for native screen QA. No production access. */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { planLinkPreview } from './fixtures.mjs';

// These fictional San Francisco plans use one explicit zone on every QA host.
process.env.TZ = 'America/Los_Angeles';
const port = Number(process.env.VILLAGE_QA_PORT ?? 54329);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local QA port');
const id = (n) => `99000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = () => new Date().toISOString();
const date = (offset, hour = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const parent = (n, name, tone) => ({
  id: id(n), auth_user_id: id(100 + n), display_name: name,
  avatar_color: tone, avatar_initials: name.split(' ').map((s) => s[0]).join(''),
  neighborhood: 'Noe Valley', avatar_url: null, bio: 'Usually carrying snacks.',
  profile_background: 'peach', profile_background_url: null, visibility_mode: 'disabled',
  calendar_connected_at: null, calendar_provider: null, created_at: date(-30),
});
const parents = [parent(1, 'Alex Rivera', 'peach'), parent(2, 'Jamie Chen', 'sage'), parent(3, 'Sam Patel', 'golden'), parent(4, 'Taylor Brooks', 'sage')];
const venue = (n, name, emoji, lat, lng) => ({
  id: id(n), name, emoji, lat, lng, geofence_radius_m: 150,
  venue_type: 'park', default_hangout: true, image_url: null, image_source: null,
  image_attribution: null, image_attribution_url: null, google_place_id: null,
});
const venues = [venue(201, 'Dolores Park', '🌳', 37.7596, -122.4269), venue(202, 'Douglass Playground', '🛝', 37.7515, -122.4383)];
const plan = (n, name, day, extra = {}) => ({
  id: id(n), name, emoji: '🎨', description: 'Bring the kids and a snack. We would love some familiar faces!',
  venue_id: venues[0].id, starts_at: date(day, 10), ends_at: date(day, 12),
  source: 'user_created', source_metadata: {}, confidence_score: null,
  created_by: parents[1].id, published: true, visibility: 'connections',
  location_name: venues[0].name, location_address: 'Dolores Park, San Francisco',
  external_url: null, external_source_key: null, cover_image_url: null,
  plan_kind: 'gathering', schedule_kind: 'once', schedule_days: [], schedule_timezone: 'America/Los_Angeles',
  all_day: false, updated_at: now(), cancelled_at: null, created_at: date(-2), ...extra,
});
const tables = {
  parents, venues,
  activities: [
    plan(301, 'Today: come picnic', 0, { all_day: true, starts_at: date(0), ends_at: null, emoji: '🧺' }),
    plan(302, 'Art club with friends', 1, { external_url: 'https://example.test/art-club', external_source_key: 'url:https://example.test/art-club/', plan_kind: 'signup', emoji: '🎨' }),
    plan(303, 'Camping under the stars', 3, { all_day: true, starts_at: date(3), ends_at: date(5), emoji: '⛺', created_by: parents[0].id }),
    plan(306, 'Garden hangout', 2, { created_by: id(4) }),
    plan(307, 'Private birthday picnic', 3, { visibility: 'invited' }),
    plan(304, 'Last weekend at the park', -3, { emoji: '🌳' }),
    plan(305, 'Raincheck playground morning', 2, { cancelled_at: now(), emoji: '☔' }),
  ],
  activity_interactions: [
    { id: id(401), activity_id: id(302), parent_id: id(2), state: 'going', rsvp_note: 'Milo · Tuesday mornings', state_changed_at: now(), created_at: now() },
    { id: id(402), activity_id: id(303), parent_id: id(1), state: 'going', rsvp_note: null, state_changed_at: now(), created_at: now() },
  ],
  parent_locations: [
    { id: id(501), parent_id: id(2), venue_id: id(201), visible: true, auto_share_at: null, last_seen_at: now(), expires_at: new Date(Date.now() + 90 * 60_000).toISOString() },
  ],
  connection_invites: [
    { id: id(910), token: id(910), plan_id: id(301), inviter_id: id(2), active: true },
    { id: id(911), token: id(911), plan_id: id(306), inviter_id: id(4), active: true },
    { id: id(912), token: id(912), plan_id: id(307), inviter_id: id(2), active: true },
    { id: id(913), token: id(913), plan_id: id(307), inviter_id: id(2), active: false },
  ],
  parent_hangout_spots: [],
  connections: [2, 3].map((n) => ({ id: id(600 + n), parent_a: id(1), parent_b: id(n), status: 'connected', initiated_by: id(1), created_at: date(-20), responded_at: date(-20) })),
  connection_preferences: [], connection_notifications: [], prompts: [], plan_invites: [],
  post_reactions: [],
  post_comments: [{ id: id(701), post_id: id(801), author_id: id(2), body: 'Same time next weekend? We can bring the bubbles.', created_at: date(-1, 15) }],
  posts: [
    { id: id(801), author_id: id(2), type: 'photo', body: 'The kids invented a game with absolutely no rules, then spent twenty minutes arguing about the rules. We stayed until the snacks ran out. These little unplanned afternoons are my favorite part of the week. Next time, bring bubbles and we will bring the extra picnic blanket!', media_path: null, activity_id: id(304), story_id: null, location_share_mode: 'none', venue_id: id(201), reaction_emoji: '❤️', created_at: date(-1, 14) },
    { id: id(802), author_id: id(3), type: 'text', body: 'Anyone doing the Tuesday art class? We just signed up and would love a familiar face.', media_path: null, activity_id: id(302), story_id: null, location_share_mode: 'none', venue_id: null, reaction_emoji: '🙌', created_at: date(-1, 12) },
  ],
  kids: [{ id: id(901), parent_id: id(1), name: 'Avery', birth_year: 2022, interests: ['drawing', 'parks'], photo_url: null, created_at: date(-30) }],
  connection_circles: [
    { id: id(1001), owner_id: id(1), name: 'Preschool pals', emoji: '🖍️', created_at: date(-20), updated_at: date(-20), members: [{ parent_id: id(2) }, { parent_id: id(3) }] },
    { id: id(1002), owner_id: id(1), name: 'College friends', emoji: '🎓', created_at: date(-10), updated_at: date(-10), members: [{ parent_id: id(3) }] },
  ], calendar_events: [], parent_notification_preferences: [],
};
const failures = new Set();
let failAfterMutation = null;
let needsProfile = false;
const mutations = [];
const uploads = new Map();
function recordMutation(name, method, body) {
  mutations.push({ name, method, body });
  if (failAfterMutation?.trigger === `${name}:${method}`) {
    for (const failure of failAfterMutation.fail) failures.add(failure);
    failAfterMutation = null;
  }
}
const user = { id: id(101), aud: 'authenticated', role: 'authenticated', email: 'parent@example.test', email_confirmed_at: date(-30), user_metadata: { full_name: 'Alex Rivera' }, app_metadata: { provider: 'email', providers: ['email'] }, created_at: date(-30) };
const session = () => {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp, role: 'authenticated', aud: 'authenticated' })}.local-qa`, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'local-qa-refresh', user };
};
function matches(row, query) {
  for (const [key, expr] of query) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    if (key === 'or') {
      if (!expr.slice(1, -1).split(',').some((clause) => {
        const [field, ...rest] = clause.split('.');
        return matches(row, [[field, rest.join('.')]]);
      })) return false;
      continue;
    }
    const [op, ...tail] = expr.split('.');
    const value = tail.join('.');
    const current = row[key];
    if (op === 'eq' && String(current) !== value) return false;
    if (op === 'neq' && String(current) === value) return false;
    if (op === 'is' && (value === 'null' ? current != null : String(current) !== value)) return false;
    if (op === 'in' && !value.slice(1, -1).replaceAll('"', '').split(',').includes(String(current))) return false;
    if (op === 'not') {
      if (value.startsWith('in.') && value.slice(4, -1).replaceAll('"', '').split(',').includes(String(current))) return false;
      else if (value === 'is.null' && current == null) return false;
      else if (!value.startsWith('in.') && value !== 'is.null') throw new Error(`Unsupported QA filter: ${expr}`);
    }
    if (op === 'gt' && !(current != null && current > value)) return false;
    if (op === 'gte' && !(current != null && current >= value)) return false;
    if (op === 'lt' && !(current != null && current < value)) return false;
    if (op === 'lte' && !(current != null && current <= value)) return false;
    if (!['eq', 'neq', 'is', 'in', 'not', 'gt', 'gte', 'lt', 'lte'].includes(op)) throw new Error(`Unsupported QA filter: ${expr}`);
  }
  return true;
}
function embed(table, row) {
  if (table === 'activities' || table === 'parent_hangout_spots') return { ...row, venue: venues.find((v) => v.id === row.venue_id) ?? null };
  if (table === 'parent_locations') return { ...row, parent: parents.find((p) => p.id === row.parent_id), venue: venues.find((v) => v.id === row.venue_id) ?? null };
  if (table === 'posts') return { ...row, author: parents.find((p) => p.id === row.author_id), activity: tables.activities.find((a) => a.id === row.activity_id) ?? null, venue: venues.find((v) => v.id === row.venue_id) ?? null, reactions: [{ count: tables.post_reactions.filter((r) => r.post_id === row.id).length }], comments: [{ count: tables.post_comments.filter((c) => c.post_id === row.id).length }] };
  if (table === 'post_comments') return { ...row, author: parents.find((p) => p.id === row.author_id) };
  if (table === 'connections') return { ...row, parentA: parents.find((p) => p.id === row.parent_a), parentB: parents.find((p) => p.id === row.parent_b) };
  if (table === 'activity_interactions') return { ...row, activity: embed('activities', tables.activities.find((a) => a.id === row.activity_id)) };
  return row;
}
function participants(planIds) {
  return tables.activity_interactions.filter((r) => planIds.includes(r.activity_id)).map((r) => {
    const p = parents.find((p) => p.id === r.parent_id);
    return { ...r, plan_id: r.activity_id, display_name: p.display_name, neighborhood: p.neighborhood, avatar_color: p.avatar_color, avatar_initials: p.avatar_initials, avatar_url: null, profile_visible: true };
  });
}
function rpc(name, body, signedIn) {
  // This fixture has no blocked or suggested parents; SQL tests exercise their policies.
  if (name === 'blocked_parents' || name === 'suggested_connections') return [];
  if (name === 'complete_onboarding') {
    if (!signedIn || !body.p_display_name?.trim()) throw new Error('Invalid fixture profile');
    needsProfile = false;
    Object.assign(parents[0], { display_name: body.p_display_name.trim(), neighborhood: body.p_neighborhood });
    return parents[0];
  }
  if (name === 'get_or_create_plan_invite') {
    const p = tables.activities.find((p) => p.id === body.p_plan);
    if (!signedIn || !p || p.created_by !== id(1) || p.cancelled_at) throw new Error('Plan not found');
    let invite = tables.connection_invites.find((i) => i.plan_id === p.id && i.inviter_id === id(1) && i.active);
    if (!invite) {
      invite = { id: randomUUID(), token: randomUUID(), inviter_id: id(1), plan_id: p.id, active: true };
      tables.connection_invites.push(invite);
    }
    return invite;
  }
  if (name === 'preview_connection_invite' || name === 'redeem_connection_invite') {
    const invite = tables.connection_invites.find((i) => i.token === body.p_reference);
    if (!invite) { if (name === 'preview_connection_invite') return { found: false }; throw new Error('Invite not found'); }
    const p = tables.activities.find((p) => p.id === invite.plan_id);
    let edge = tables.connections.find((c) => [c.parent_a, c.parent_b].includes(invite.inviter_id) && [c.parent_a, c.parent_b].includes(id(1)) && c.status === 'connected');
    const isSelf = signedIn && invite.inviter_id === id(1);
    if (name === 'preview_connection_invite') return {
      found: true, active: invite.active, inviter: parents.find((p) => p.id === invite.inviter_id),
      needs_profile: signedIn && needsProfile, is_self: isSelf, already_connected: signedIn && Boolean(edge),
      plan: { id: p.id, can_view: signedIn && !needsProfile && (isSelf || (p.visibility === 'invited' ? tables.plan_invites.some((i) => i.plan_id === p.id && i.invited_parent_id === id(1)) : Boolean(edge))) },
    };
    if (!signedIn || needsProfile || !invite.active) throw new Error('This invite is no longer active');
    if (!edge) {
      edge = { id: randomUUID(), parent_a: id(1), parent_b: invite.inviter_id, status: 'connected', initiated_by: invite.inviter_id };
      tables.connections.push(edge);
    }
    if (p.visibility === 'invited' && !tables.plan_invites.some((i) => i.plan_id === p.id && i.invited_parent_id === id(1))) tables.plan_invites.push({ plan_id: p.id, invited_parent_id: id(1), invited_by: invite.inviter_id });
    return edge;
  }
  if (name === 'plan_participants') return participants(body.p_plan_ids);
  if (name === 'plan_shared_by') return tables.activities.filter((p) => body.p_plan_ids.includes(p.id)).flatMap((p) => {
    const sharer = parents.find((person) => person.id === p.created_by);
    return sharer ? [{ plan_id: p.id, parent_id: sharer.id, display_name: sharer.display_name, avatar_color: sharer.avatar_color, avatar_initials: sharer.avatar_initials, avatar_url: sharer.avatar_url, profile_visible: true }] : [];
  });
  if (name === 'mutual_friend_count') return 0;
  if (name === 'get_my_phone') return null;
  if (name === 'submit_parent_report') {
    if (!parents.some((p) => p.id === body.other) || !body.p_reason || typeof body.p_details !== 'string') throw new Error('Invalid fixture report');
    return randomUUID(); // The RPC request is recorded in mutations below.
  }
  if (name === 'set_plan_rsvp') {
    const activity = tables.activities.find((p) => p.id === body.p_plan);
    if (!activity || activity.cancelled_at) throw new Error('Plan not found');
    if (!['going', 'interested', 'out'].includes(body.p_state)) throw new Error('Invalid RSVP');
    let row = tables.activity_interactions.find((r) => r.activity_id === body.p_plan && r.parent_id === id(1));
    if (!row) { row = { id: randomUUID(), activity_id: body.p_plan, parent_id: id(1), created_at: now(), rsvp_note: null }; tables.activity_interactions.push(row); }
    Object.assign(row, { state: body.p_state, state_changed_at: now() }, body.p_note == null ? {} : { rsvp_note: body.p_note.trim() || null });
    return row;
  }
  if (name === 'clear_plan_rsvp') { tables.activity_interactions = tables.activity_interactions.filter((r) => !(r.activity_id === body.p_plan && r.parent_id === id(1))); return null; }
  if (name === 'cancel_plan') { const p = tables.activities.find((a) => a.id === body.p_plan); if (!p) throw new Error('Plan not found'); p.cancelled_at = now(); return null; }
  if (['create_plan_v2', 'update_plan_v2', 'create_plan_v3', 'update_plan_v3'].includes(name)) {
    const values = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'p_plan' && key !== 'p_invited_parent_ids').map(([key, value]) => [key.slice(2), value]));
    const invitees = [...new Set(body.p_invited_parent_ids ?? [])];
    const editing = name.startsWith('update_');
    let p = editing ? tables.activities.find((a) => a.id === body.p_plan) : null;
    if (editing && (!p || p.created_by !== id(1) || p.cancelled_at)) throw new Error('Plan not found');
    if (!values.name?.trim()) throw new Error('Give the plan a name');
    if (values.visibility === 'invited' && !invitees.length) throw new Error('Choose at least one connection');
    if (invitees.some((personId) => ![id(2), id(3)].includes(personId))) throw new Error('Plans can only invite your current connections');
    if (values.ends_at && (!values.starts_at || Date.parse(values.ends_at) < Date.parse(values.starts_at))) throw new Error('Choose an end after the start of the plan');
    if (name.endsWith('_v3')) {
      if (!['gathering', 'signup'].includes(values.plan_kind)) throw new Error('Invalid plan kind');
      if (!['once', 'weekly'].includes(values.schedule_kind)) throw new Error('Invalid schedule kind');
      if (!Array.isArray(values.schedule_days)) throw new Error('Invalid schedule days');
      if (values.schedule_kind === 'weekly' && (!values.starts_at || !values.ends_at || !values.schedule_days.length)) throw new Error('Choose the weekly dates and days');
      if (values.schedule_days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('Invalid schedule days');
    }
    values.name = values.name.trim();
    for (const field of ['description', 'emoji', 'location_name', 'location_address', 'external_url', 'external_source_key', 'cover_image_url']) {
      if (field in values) values[field] = values[field]?.trim() || null;
    }
    const previousInvitees = p ? tables.plan_invites.filter((i) => i.plan_id === p.id).map((i) => i.invited_parent_id) : [];
    if (!p) { p = plan(0, values.name, 1, { id: randomUUID(), created_by: id(1), venue_id: null }); tables.activities.push(p); }
    Object.assign(p, values, { updated_at: now() });
    tables.plan_invites = tables.plan_invites.filter((i) => i.plan_id !== p.id);
    for (const invited_parent_id of values.visibility === 'invited' ? invitees : []) tables.plan_invites.push({ plan_id: p.id, invited_parent_id });
    const candidates = values.visibility === 'invited' ? invitees.filter((person) => !previousInvitees.includes(person))
      : !editing && name === 'create_plan_v3' ? tables.connections.filter((c) => c.status === 'connected' && [c.parent_a, c.parent_b].includes(id(1))).map((c) => c.parent_a === id(1) ? c.parent_b : c.parent_a) : [];
    const notified = candidates.filter((person) => tables.parent_notification_preferences.find((pref) => pref.parent_id === person)?.plan_invitations !== false);
    return { plan: p, notified_parent_ids: notified };
  }
  throw new Error(`Unsupported QA RPC: ${name}`);
}
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,HEAD,OPTIONS');
  const send = (status, value) => { res.statusCode = status; res.end(req.method === 'HEAD' ? undefined : JSON.stringify(value)); };
  if (req.method === 'OPTIONS') return send(204, null);
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    if (url.pathname.startsWith('/storage/v1/object/')) {
      const key = url.pathname.replace('/storage/v1/object/', '').replace(/^public\//, '');
      if (req.method === 'POST') {
        if (!bytes.length) return send(400, { message: 'Empty image upload rejected by QA server' });
        uploads.set(key, { bytes, type: req.headers['content-type'] ?? 'image/jpeg' });
        mutations.push({ name: 'image_upload', key, byteLength: bytes.length });
        return send(200, { Key: key });
      }
      if (req.method === 'GET') {
        const file = uploads.get(key);
        if (!file) return send(404, { message: 'Image not found' });
        res.setHeader('Content-Type', file.type);
        return res.end(file.bytes);
      }
      throw new Error(`Unsupported QA storage method: ${req.method}`);
    }
    const body = bytes.length ? JSON.parse(bytes.toString('utf8')) : {};
    if (url.pathname === '/__qa/control' && req.method === 'POST') {
      failures.clear();
      for (const failure of body.fail ?? []) failures.add(failure);
      failAfterMutation = body.failAfterMutation ?? null;
      if ('needsProfile' in body) needsProfile = Boolean(body.needsProfile);
      return send(200, { failures: [...failures] });
    }
    if (url.pathname === '/__qa/state') return send(200, { tables, mutations, uploads: [...uploads].map(([key, file]) => ({ key, byteLength: file.bytes.length })) });
    if (url.pathname === '/auth/v1/otp' && req.method === 'POST') {
      if (body.email !== user.email) return send(400, { msg: 'Use parent@example.test for local QA.' });
      return send(200, {});
    }
    if (url.pathname === '/auth/v1/verify') {
      if (body.email !== user.email || body.token !== '12345678') return send(400, { msg: 'Invalid local test code' });
      return send(200, session());
    }
    if (url.pathname === '/auth/v1/token') return send(200, session());
    if (url.pathname === '/auth/v1/user') return send(200, user);
    if (url.pathname === '/auth/v1/logout') return send(204, null);
    const name = url.pathname.split('/').at(-1);
    if (failures.has(name) || failures.has(`${name}:${req.method}`)) return send(503, { message: 'The local test server is simulating an unavailable connection.', code: 'QA_UNAVAILABLE' });
    if (url.pathname === '/functions/v1/plan-link-preview' && req.method === 'POST') {
      if (!req.headers.authorization?.startsWith('Bearer ')) return send(401, { error: 'Sign in to import a listing' });
      try { return send(200, planLinkPreview(body.url)); }
      catch (error) { return send(422, { error: error.message }); }
    }
    if (url.pathname === '/functions/v1/connection-push' && req.method === 'POST') {
      if (!req.headers.authorization?.endsWith('.local-qa')) return send(401, { error: 'Local QA sign-in required' });
      const target = tables.activities.find((p) => p.id === body.planId && p.created_by === id(1));
      if (body.type !== 'plan_invite' || !target || !parents.some((p) => p.id === body.recipientId)) return send(400, { error: 'Unknown fixture notification' });
      recordMutation('connection-push', req.method, body);
      // Record the real app request, but never contact Expo or claim device delivery.
      return send(200, { delivered: 0, qaOnly: true });
    }
    if (url.pathname === '/functions/v1/place-search' && req.method === 'POST') {
      // Fictional provider contract: selection must resolve details before saving.
      if (!body.sessionToken) return send(400, { error: 'Missing search session' });
      if (body.placeId === 'qa-playground') return send(200, { place: { id: 'qa-playground', name: 'Maple Playground', address: '123 Maple Street, Test City' } });
      if (body.placeId) return send(404, { error: 'Unknown fixture place' });
      return send(200, { suggestions: String(body.query).toLowerCase().includes('maple') ? [{ id: 'qa-playground', name: 'Maple Playground', address: 'Maple Street, Test City' }] : [] });
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const result = rpc(name, body, Boolean(req.headers.authorization?.endsWith('.local-qa')));
      if (!['plan_participants', 'plan_shared_by', 'mutual_friend_count', 'get_my_phone', 'preview_connection_invite'].includes(name)) recordMutation(name, req.method, body);
      return send(200, result);
    }
    if (!url.pathname.startsWith('/rest/v1/') || !tables[name]) throw new Error(`Unsupported QA endpoint: ${req.method} ${url.pathname}`);
    if (needsProfile && name === 'parents' && url.searchParams.has('auth_user_id')) return send(200, null);
    let rows = tables[name].filter((row) => matches(row, url.searchParams));
    if (req.method === 'POST') {
      const incoming = Array.isArray(body) ? body : [body];
      rows = incoming.map((value) => {
        const unique = url.searchParams.get('on_conflict')?.split(',') ?? (name === 'parent_notification_preferences' ? ['parent_id'] : ['id']);
        const existing = tables[name].find((row) => unique.every((key) => value[key] != null && row[key] === value[key]));
        if (existing) return Object.assign(existing, value);
        const defaults = name === 'parent_notification_preferences'
          ? { connection_requests: true, connection_acceptances: true, invite_redemptions: true, plan_invitations: true } : {};
        const added = { id: randomUUID(), created_at: now(), ...defaults, ...value };
        tables[name].push(added);
        return added;
      });
    } else if (req.method === 'PATCH') rows.forEach((row) => Object.assign(row, body));
    else if (req.method === 'DELETE') tables[name] = tables[name].filter((row) => !rows.includes(row));
    else if (!['GET', 'HEAD'].includes(req.method)) throw new Error(`Unsupported QA method: ${req.method}`);
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      recordMutation(name, req.method, body);
    }
    const order = url.searchParams.get('order');
    if (order) {
      const [field, direction] = order.split('.');
      rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === 'desc' ? -1 : 1));
    }
    const count = rows.length;
    if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
    res.setHeader('Content-Range', `0-${Math.max(0, count - 1)}/${count}`);
    rows = rows.map((row) => embed(name, row));
    const single = req.headers.accept?.includes('application/vnd.pgrst.object+json');
    if (single && rows.length !== 1) return send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` });
    return send(200, single ? rows[0] : rows);
  } catch (error) {
    console.error(error.message);
    return send(500, { message: error.message });
  }
}).listen(port, '127.0.0.1', () => console.log(`Local-only Village QA server: http://127.0.0.1:${port}`));
