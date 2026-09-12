// Only the fictional local QA server is targeted; no credentials or app data
// are changed. Maestro's completion hook clears failure mode even on failure.
var base = 'http://127.0.0.1:54329';

function checked(response, description) {
  if (!response.ok) throw new Error(description + ' failed: HTTP ' + response.status);
  return response.body ? json(response.body) : null;
}

function control(failures) {
  checked(http.post(base + '/__qa/control', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: failures }),
  }), 'Set local feed failure mode');
}

function normalizedBody(post) {
  return (post.body || '').replace(/\s+/g, ' ').trim();
}

function textPattern(text) {
  // Maestro selectors are regexes; accept accessibility line wrapping while
  // keeping punctuation in a memory literal rather than regex syntax.
  return '(?s).*' + text.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '.*';
}

if (MODE === 'prepare') {
  var snapshot = checked(http.get(base + '/__qa/state'), 'Read local QA fixtures');
  var fixturePost = snapshot.tables.posts.filter(function (row) {
    return row.id === '99000000-0000-4000-8000-000000000801';
  })[0];
  if (!fixturePost || fixturePost.type !== 'photo' || !fixturePost.body) {
    throw new Error('Expected fictional Village feed memory is missing. Restart scripts/qa/server.mjs.');
  }
  var orderedPosts = snapshot.tables.posts.slice().sort(function (a, b) {
    return b.created_at.localeCompare(a.created_at);
  });
  var topPost = orderedPosts[0];
  var topBody = topPost && normalizedBody(topPost);
  if (!topBody) throw new Error('The newest QA post needs a readable body for the recovery pull gesture.');
  var prefixLength = Math.min(32, topBody.length);
  function prefixIsShared() {
    var prefix = topBody.slice(0, prefixLength);
    return orderedPosts.slice(1).some(function (post) {
      return normalizedBody(post).indexOf(prefix) === 0;
    });
  }
  // Repeated memory flows share their opening sentence; include enough of
  // their unique timestamp to target the newest card rather than an older one.
  while (prefixLength < topBody.length && prefixIsShared()) {
    prefixLength = Math.min(prefixLength + 8, topBody.length);
  }
  if (prefixIsShared()) throw new Error('The newest QA post needs distinguishable text for the recovery flow.');
  output.feedRecoveryTopText = textPattern(topBody.slice(0, prefixLength));
  output.feedRecoveryCaption = textPattern(fixturePost.body);
  control([]);
} else if (MODE === 'fail') {
  control(['posts:GET']);
} else if (MODE === 'clear') {
  control([]);
} else {
  throw new Error('Unknown feed recovery mode: ' + MODE);
}
