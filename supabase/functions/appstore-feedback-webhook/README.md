# App Store Connect feedback webhook

This public endpoint receives signed App Store Connect TestFlight feedback
webhooks and sends a concise notification to `beta@withvillage.app` through
Resend. TestFlight screenshots and crash reports remain in App Store Connect;
the notification links to the correct feedback screen.

Deploy it with JWT verification disabled because App Store Connect authenticates
deliveries with its own HMAC signature:

```sh
supabase functions deploy appstore-feedback-webhook --no-verify-jwt
```

Set these Supabase Edge Function secrets before deploying:

```sh
supabase secrets set RESEND_API_KEY=... APP_STORE_CONNECT_WEBHOOK_SECRET=...
```

Create an App Store Connect webhook with this function's public URL, the same
`APP_STORE_CONNECT_WEBHOOK_SECRET`, and only these events:

- `BETA_FEEDBACK_SCREENSHOT_SUBMISSION_CREATED`
- `BETA_FEEDBACK_CRASH_SUBMISSION_CREATED`

Use App Store Connect's **Test** action after registering the webhook. Test ping
events are acknowledged but deliberately do not generate a Gmail alert.
