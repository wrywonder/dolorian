# Plan link preview

This authenticated Edge Function turns a public camp, class, market, or event
URL into editable plan fields.

It always uses a no-cost extraction path first: page metadata, JSON-LD, visible
text, dates/times, and one relevant page on the same site. If an AI key is
configured, it asks an OpenAI-compatible chat-completions endpoint to clean up
and complete those fields. Provider failures fall back to the structured result
instead of blocking plan creation.

All three Edge Function secrets are required to enable AI enrichment:

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

Nothing is published automatically. The app fills the editor and asks the
parent to review the result before saving the canonical plan.
