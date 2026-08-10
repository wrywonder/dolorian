# Village invite links

This Worker owns only the public invitation handoff and Apple association paths:

- `https://withvillage.app/join/*`
- `https://withvillage.app/.well-known/apple-app-site-association`

Installed iOS builds open `/join/*` directly through Universal Links. Older
TestFlight builds and browsers receive the handoff page, whose button uses the
existing `dolorian://invite/*` fallback.

The Apple application identifier is `756X7G9F7X.com.dolorian.app`. If the Apple
Developer team or bundle identifier changes, update both the Worker and
`expo.ios.associatedDomains` in `app.json`, then ship a new native build.

The root DNS zone has a proxied `A` record to the reserved placeholder
`192.0.2.1`. It exists only so Cloudflare can receive requests for the two
scoped Worker routes; it does not affect the domain's MX/TXT email records.
Replace that placeholder when a root marketing site is launched.
