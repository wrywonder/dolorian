// Maestro's documented synchronous HTTP API; this helper only targets the
// fictional loopback server. It never uses app/session credentials.
// https://docs.maestro.dev/advanced/javascript/make-http-s-requests
var base = 'http://127.0.0.1:54329';
var postId = '99000000-0000-4000-8000-000000000801';
var parentId = '99000000-0000-4000-8000-000000000001';
var jsonHeaders = { 'Content-Type': 'application/json' };

function checked(response, description) {
  if (!response.ok) throw new Error(description + ' failed: HTTP ' + response.status + ' ' + response.body);
  return response.body ? json(response.body) : null;
}

function state() {
  return checked(http.get(base + '/__qa/state'), 'Read local QA state');
}

function control(failures) {
  return checked(http.post(base + '/__qa/control', {
    headers: jsonHeaders,
    body: JSON.stringify({ fail: failures }),
  }), 'Set local QA failure mode');
}

function ownReactions(snapshot) {
  return snapshot.tables.post_reactions.filter(function (row) {
    return row.post_id === postId && row.parent_id === parentId;
  });
}

function removeOwnReaction() {
  checked(http.delete(base + '/rest/v1/post_reactions?post_id=eq.' + postId + '&parent_id=eq.' + parentId), 'Reset QA reaction');
}

if (MODE === 'prepare') {
  output.feedPrepared = false;
  var snapshot = state();
  var fixtureParent = snapshot.tables.parents.filter(function (row) { return row.id === parentId; })[0];
  var fixturePost = snapshot.tables.posts.filter(function (row) { return row.id === postId; })[0];
  if (!fixtureParent || fixtureParent.display_name !== 'Alex Rivera' || !fixturePost) {
    throw new Error('Expected fictional Village feed fixtures are missing. Restart scripts/qa/server.mjs.');
  }
  output.feedOriginalReactions = ownReactions(snapshot);
  output.feedComment = 'Maestro feed retry ' + Date.now();
  output.feedCaption = fixturePost.body;
  var emoji = fixturePost.reaction_emoji || '❤️';
  var otherReactions = snapshot.tables.post_reactions.filter(function (row) {
    return row.post_id === postId && row.parent_id !== parentId;
  }).length;
  output.feedAddLabel = 'Add ' + emoji + ' reaction, ' + otherReactions + ' reactions';
  output.feedRemoveLabel = 'Remove ' + emoji + ' reaction, ' + (otherReactions + 1) + ' reactions';
  output.feedCommentCount = snapshot.tables.post_comments.filter(function (row) { return row.post_id === postId; }).length;
  output.feedCommentsLabel = 'Open comments, ' + output.feedCommentCount + ' comments';
  output.feedPrepared = true;
  control([]);
  removeOwnReaction();
} else if (MODE === 'fail-comment') {
  control(['post_comments:POST']);
} else if (MODE === 'clear-failure') {
  control([]);
} else if (MODE === 'verify-added') {
  if (ownReactions(state()).length !== 1) throw new Error('Reaction tap must persist exactly one reaction for the QA parent.');
} else if (MODE === 'verify-removed') {
  if (ownReactions(state()).length !== 0) throw new Error('Remove reaction must persist zero reactions for the QA parent.');
} else if (MODE === 'verify-comment-failed' || MODE === 'verify-comment-saved') {
  var count = state().tables.post_comments.filter(function (row) {
    return row.post_id === postId && row.author_id === parentId && row.body === output.feedComment;
  }).length;
  var expected = MODE === 'verify-comment-saved' ? 1 : 0;
  if (count !== expected) throw new Error('Expected ' + expected + ' persisted retry comments; found ' + count + '.');
} else if (MODE === 'cleanup') {
  // Hooks run even when an assertion fails: never strand subsequent flows in
  // simulated offline mode, and restore just the fixture data this flow changed.
  control([]);
  if (output.feedPrepared) {
    checked(http.delete(base + '/rest/v1/post_comments?post_id=eq.' + postId
      + '&author_id=eq.' + parentId + '&body=eq.' + encodeURIComponent(output.feedComment)), 'Remove this flow\'s QA comment');
    removeOwnReaction();
    if (output.feedOriginalReactions.length) {
      checked(http.post(base + '/rest/v1/post_reactions?on_conflict=post_id,parent_id', {
        headers: jsonHeaders,
        body: JSON.stringify(output.feedOriginalReactions),
      }), 'Restore original QA reaction');
    }
  }
} else {
  throw new Error('Unknown feed-control mode: ' + MODE);
}
