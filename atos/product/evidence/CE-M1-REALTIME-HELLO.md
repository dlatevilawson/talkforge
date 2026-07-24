# CE-M1 Evidence — Realtime Hello

| Field | Value |
|---|---|
| **Document ID** | CE-M1-EVIDENCE |
| **Milestone** | CE-M1 |
| **Directive** | DIR-CE-001 / RES-013 |
| **Status** | **PASS** (implemented + verified) |
| **Date** | 2026-07-20 |
| **CE-M2** | **Not started** — awaiting Founder acceptance of CE-M1 |

---

## Objectives

| # | Objective | Result |
|---|---|---|
| 1 | Secure realtime voice session | **PASS** — ephemeral `ek_` via `/api/realtime/session`; API key server-only |
| 2 | User presses Start | **PASS** — `/voice` Start CTA |
| 3 | Forge speaks first | **PASS** — `response.create` after data channel open; remote audio track + `response.done` |
| 4 | Stable voice connection | **PASS** — peer `connected` held 30s+; Stop disconnects cleanly |
| 5 | Implementation evidence | **PASS** — this package + screenshots + verify script |

---

## Files shipped

| Path | Role |
|---|---|
| `app/api/realtime/session/route.ts` | Ephemeral session mint |
| `lib/ce/session-config.ts` | Model `gpt-realtime-2.1`, voice, NPC instructions |
| `lib/ce/realtime.ts` | WebRTC connect, silent-mic fallback, opening speech, disconnect |
| `app/components/VoiceArena.tsx` | CE-M1 UI |
| `app/voice/page.tsx` | Route |
| `scripts/ce-m1-verify.mjs` | Server-side mint verification |

---

## Automated verification

```bash
node scripts/ce-m1-verify.mjs
# ok: true, key_prefix ek_, model gpt-realtime-2.1

CE_M1_BASE=http://localhost:3000 node scripts/ce-m1-verify.mjs --via-app
# ok: true, milestone CE-M1
```

---

## Browser verification (2026-07-20)

Environment: cloud agent Chrome @ `http://localhost:3000/voice`  
Note: No physical mic → **silent track fallback** (documented). Real mic used when present.

| Check | Result |
|---|---|
| Ephemeral session minted | PASS |
| Silent fallback message shown | PASS |
| Status **Forge speaking** | PASS |
| Remote audio track received | PASS |
| Peer **connected** | PASS |
| Opening speech `response.done` | PASS |
| Stable ~30s | PASS |
| Stop → disconnect cleanly | PASS |

Artifacts: `/opt/cursor/artifacts/ce-m1/` (`forge-speaking.webp`, `connected.webp`, `connection-log.webp`, `stopped.webp`)

Sample log:

```
Minting ephemeral Realtime session…
Ephemeral key received (session sess_…)
Connecting WebRTC (mic or silent fallback)…
No mic device — silent track fallback …
Remote audio track received from Forge
Peer connection: connected
response.create sent (interviewer opening)
Opening speech response complete
Disconnected cleanly
```

---

## Explicit non-scope (held)

- CE-M2 transcripts — **not started**  
- CE-M3 coaching — **not started**  
- CE-M4 prepare→voice — **not started**  

---

## Founder gate

CE-M1 is ready for Founder acceptance. **Do not begin CE-M2 until Founder verifies/accepts CE-M1.**
