# Plan link preview

This authenticated Edge Function turns a public camp, class, market, or event
URL into editable plan fields.

It always uses a no-cost extraction path first: page metadata, JSON-LD, visible
text, dates/times, and one relevant page on the same site. If an AI key is
configured, it asks an OpenAI-compatible chat-completions endpoint to clean up
and complete those fields. Provider failures fall back to the structured result
instead of blocking plan creation.

These three Edge Function secrets enable AI enrichment:

- `PLAN_IMPORT_API_KEY` — provider API token.
- `PLAN_IMPORT_BASE_URL` — provider's OpenAI-compatible base URL.
- `PLAN_IMPORT_MODEL` — provider model identifier.

Village uses Cloudflare Workers AI. Its configuration is:

- Base URL:
  `https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1`
- Model: `@cf/meta/llama-3.1-8b-instruct-fast`

The Cloudflare token is stored only as a Supabase Edge Function secret. Do not
put it in `.env`, EAS variables, or any `EXPO_PUBLIC_` setting. If any provider
setting is missing or the provider is unavailable, the deterministic extractor
continues to work without AI.

Some registration sites, including Sawyer, return a Cloudflare challenge to
server-side fetches and render their actual schedules with JavaScript. For those
pages the importer makes one best-effort call to Cloudflare Browser Rendering,
then runs the same deterministic and AI extraction over the rendered HTML.

- If the Workers AI token also has **Browser Rendering Write**, no additional
  settings are needed; the endpoint is derived from `PLAN_IMPORT_BASE_URL`.
- `PLAN_IMPORT_BROWSER_RENDERING_URL` can explicitly set the Cloudflare
  `/accounts/<ACCOUNT_ID>/browser-rendering/content` endpoint.
- `PLAN_IMPORT_BROWSER_RENDERING_API_KEY` can use a separate least-privilege
  Browser Rendering token. If omitted, `PLAN_IMPORT_API_KEY` is reused.

Browser rendering only runs when the direct response is blocked. If it is not
configured or unavailable, known providers still return honest editable fields
from their URL (for example the Sawyer organization and selected date), plus a
warning that the parent must confirm the missing schedule details.

Nothing is published automatically. The app fills the editor and asks the
parent to review the result before saving the canonical plan.
