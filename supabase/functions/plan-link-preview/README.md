# Plan link preview

This authenticated Edge Function turns a public camp, class, market, or event
URL into editable plan fields.

It always uses a no-cost extraction path first: page metadata, JSON-LD, visible
text, dates/times, and one relevant page on the same site. If an AI key is
configured, it asks an OpenAI-compatible chat-completions endpoint to clean up
and complete those fields. Provider failures fall back to the structured result
instead of blocking plan creation.

Edge Function secrets:

- `PLAN_IMPORT_API_KEY` — enables AI enrichment.
- `PLAN_IMPORT_BASE_URL` — optional; defaults to
  `https://api.groq.com/openai/v1`.
- `PLAN_IMPORT_MODEL` — optional; defaults to `llama-3.1-8b-instant`.

Nothing is published automatically. The app fills the editor and asks the
parent to review the result before saving the canonical plan.
