# DevAI Studio API Worker

This Worker keeps the AI provider key on the server.

## Deploy

1. Install Node.js and Wrangler: `npm install -g wrangler`
2. From this folder run: `wrangler login`
3. Set your provider key as a secret:
   `wrangler secret put AI_API_KEY`
4. Set/change `AI_BASE_URL` and `AI_MODEL` in `wrangler.toml`.
5. Deploy: `wrangler deploy`
6. Copy the Worker URL and add `/api/chat` in the frontend settings, or set `VITE_AI_API_URL` to the Worker base URL.

The endpoint expects an OpenAI-compatible Chat Completions API. Provider model names and response-format support vary. If your provider does not support `response_format: json_object`, remove that property and keep the JSON-only system instruction.

## Important security notes

- Add rate limiting and authentication before making this endpoint public for production.
- Configure CORS to your exact GitHub Pages origin instead of `*` for production.
- Set usage limits/alerts at your AI provider.
- Never commit `.dev.vars` or API keys.
- This Worker generates files as text; it does not run untrusted user code.
