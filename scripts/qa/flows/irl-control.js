// Runs only against the fictional loopback server. Never use production here.
var control = MODE === 'after-share'
  ? { failAfterMutation: { trigger: 'parent_locations:POST', fail: ['parent_locations:GET'] } }
  : MODE === 'stop-failure' ? { fail: ['parent_locations:PATCH'] } : { fail: [] };
if (MODE !== 'verify-shared' && MODE !== 'verify-stopped') {
  var response = http.post('http://127.0.0.1:54329/__qa/control', {
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(control),
  });
  if (response.status !== 200) throw new Error('Could not configure local IRL QA');
} else {
  var state = json(http.get('http://127.0.0.1:54329/__qa/state').body);
  var me = state.tables.parents.find(p => p.id.endsWith('000000000001'));
  var visit = state.tables.parent_locations.find(p => p.parent_id === me.id);
  if (me.visibility_mode !== 'disabled') throw new Error('Manual check-in changed automatic sharing preference');
  if (MODE === 'verify-shared' && (!visit || !visit.visible || !visit.venue_id.endsWith('000000000201'))) throw new Error('Visit was not persisted');
  if (MODE === 'verify-stopped' && visit && (visit.visible || visit.venue_id)) throw new Error('Visit did not stop');
}
