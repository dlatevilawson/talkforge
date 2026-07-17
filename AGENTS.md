<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

TalkForge is a single Next.js 16 (App Router) web app — an "AI communication gym". There is one app, no separate backend/database/queue; the backend is just Next.js route handlers under `app/api/`.

Standard scripts live in `package.json` (`dev`, `build`, `start`, `lint`). Run the dev server with `npm run dev` (serves everything at http://localhost:3000).

- **`OPENAI_API_KEY` is required for the core feature.** `POST /api/coach` (`app/api/coach/route.ts`) calls the OpenAI API (model `gpt-5`) and drives every training conversation. The key is provided as an environment secret in Cursor Cloud and is read directly from `process.env`, so no `.env` file is needed. Without it (or without egress to `api.openai.com`), pages still render but any "Continue" in a mission returns HTTP 500. A coach call typically takes ~8-15s.
- `next build` succeeds despite a pre-existing ESLint error (`react/no-unescaped-entities` in `app/components/TrainingArena.tsx`); the build does not run ESLint. Run `npm run lint` separately to see lint issues.
