# Deploy Note — TalkForge CE on Founder Vercel Account

| Field | Value |
|---|---|
| **Document ID** | DEPLOY-001 |
| **Version** | 1.0.0 |
| **Status** | Authoritative (ops note) |
| **Date** | 2026-07-21 |
| **Authority** | Founder Directive — do not delay beta waiting on old host |
| **Related** | BR-001 / RES-015 |

---

## Ownership finding

| Host | Accessible under Founder Vercel (`dlatevilawson-7440`)? |
|---|---|
| `https://talkforge.vercel.app` | **No** — `vercel inspect` / project list / domains: not found. Different account or lost access. Do **not** chase. |
| New project `talkforge` under `dlatevilawson-7440s-projects` | **Yes** — created and owned here. |

## New production (this repository)

| Item | Value |
|---|---|
| **Stable production URL** | **https://talkforge-virid.vercel.app** |
| Deployment URL (this ship) | https://talkforge-87pjtnydz-dlatevilawson-7440s-projects.vercel.app |
| Vercel project | `dlatevilawson-7440s-projects/talkforge` |
| Inspector | https://vercel.com/dlatevilawson-7440s-projects/talkforge/GWZYkaUs25X49S5GYLWjpW7Vt2mn |
| Env set | `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production / preview / development) |

### Smoke (server)

| Check | Result |
|---|---|
| `/` | 200 — TalkForge CE homepage |
| `/voice` `/dashboard` `/prepare` `/auth` | 200 |
| `POST /api/realtime/session` | 200 — ephemeral `ek_` minted (CE-M1) |
| Old `talkforge.vercel.app/voice` | Still 404 (ignored) |

## Gaps remaining (BR-001)

Public deploy of **this** app is no longer the blocker. Still required before external invite:

1. Real iPhone / Android mic → Forge → hold-to-speak smoke on **https://talkforge-virid.vercel.app**
2. Session completion / coaching next-step
3. Trust copy / single start path

## Ops notes

- GitHub ↔ Vercel **Login Connection** not linked yet (CLI deploy used). Founder should connect GitHub in Vercel for auto-deploys from `main`.
- `.vercel/` is gitignored — local link only.
- Prefer **https://talkforge-virid.vercel.app** as the beta invite URL until a custom domain is attached.
