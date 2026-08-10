const APP_ID = '756X7G9F7X.com.dolorian.app';

const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function appleAssociation() {
  return Response.json({
    applinks: {
      details: [{
        appIDs: [APP_ID],
        components: [
          { '/': '/join/*', comment: 'Village connection invitations' },
          { '/': '/invite/*', comment: 'Legacy Village invitations' },
        ],
      }],
    },
  }, {
    headers: {
      ...securityHeaders,
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function invitationPage(reference, requestUrl) {
  const encodedReference = encodeURIComponent(reference);
  const appUrl = `dolorian://invite/${encodedReference}`;
  const canonicalUrl = `https://withvillage.app/join/${encodedReference}`;
  const safeCanonicalUrl = escapeHtml(canonicalUrl);
  const safeRequestUrl = escapeHtml(requestUrl);

  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>A private invitation to Village</title>
    <meta name="description" content="A parent you know invited you to connect privately in Village.">
    <meta property="og:title" content="Come join me in Village">
    <meta property="og:description" content="A private invitation from a parent you know.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${safeCanonicalUrl}">
    <meta name="twitter:card" content="summary">
    <link rel="canonical" href="${safeCanonicalUrl}">
    <style>
      :root { color-scheme: light; font-family: ui-rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #fbf4e9; color: #2d241b; display: grid; place-items: center; padding: max(28px, env(safe-area-inset-top)) 22px max(28px, env(safe-area-inset-bottom)); }
      main { width: min(100%, 440px); text-align: center; }
      .mark { width: 66px; height: 66px; margin: 0 auto 24px; display: grid; place-items: center; border-radius: 50%; background: #fffdf6; border: 1px solid #ecd49a; color: #c96442; font-family: Georgia, serif; font-size: 38px; font-style: italic; }
      .eyebrow { margin: 0 0 10px; color: #a0907e; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
      h1 { margin: 0; font-family: Georgia, serif; font-size: clamp(38px, 10vw, 52px); line-height: 1; font-weight: 400; }
      .intro { margin: 18px auto 26px; max-width: 360px; color: #6e5e4e; font-size: 16px; line-height: 1.55; }
      .card { padding: 20px; border-radius: 24px; background: #fffdf6; border: 1px solid #ecd49a; box-shadow: 0 8px 0 rgba(110, 94, 78, .08); }
      .button { display: block; width: 100%; padding: 17px 20px; border-radius: 999px; background: #c96442; color: white; text-decoration: none; font-size: 16px; font-weight: 800; }
      .help { margin: 15px 8px 0; color: #a0907e; font-size: 13px; line-height: 1.5; }
      .privacy { margin-top: 24px; color: #a0907e; font-family: Georgia, serif; font-size: 15px; font-style: italic; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">V</div>
      <p class="eyebrow">A PRIVATE INVITATION</p>
      <h1>come join me in Village</h1>
      <p class="intro">A parent you know invited you to connect in Village, the private place for your people and your plans.</p>
      <section class="card">
        <a class="button" href="${escapeHtml(appUrl)}">open Village →</a>
        <p class="help">If Village is not installed yet, install the TestFlight beta from your invitation, then return to this message.</p>
      </section>
      <p class="privacy">Connections are mutual, private, and always under your control.</p>
      <noscript><a href="${safeRequestUrl}">Reload invitation</a></noscript>
    </main>
  </body>
</html>`, {
    headers: {
      ...securityHeaders,
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: securityHeaders });
    }
    if (url.pathname === '/.well-known/apple-app-site-association') return appleAssociation();

    const match = url.pathname.match(/^\/join\/([^/]+)\/?$/);
    if (!match?.[1] || match[1].length > 100) {
      return new Response('Invitation not found', { status: 404, headers: securityHeaders });
    }
    let reference;
    try {
      reference = decodeURIComponent(match[1]);
    } catch {
      return new Response('Invitation not found', { status: 404, headers: securityHeaders });
    }
    return invitationPage(reference, url.toString());
  },
};
