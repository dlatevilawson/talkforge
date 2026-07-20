# CE-M2 Evidence — Stable Transcripts

| Field | Value |
|---|---|
| **Document ID** | CE-M2-EVIDENCE |
| **Milestone** | CE-M2 |
| **Directive** | DIR-CE-001 / RES-013 |
| **Prerequisite** | CE-M1 APPROVED |
| **Status** | Implemented — **Founder test sessions required for acceptance** |
| **Date** | 2026-07-20 |
| **CE-M3** | **Not started** |

---

## Objectives

| # | Objective | Implementation |
|---|---|---|
| 1 | Capture Founder voice | Input transcription (`gpt-4o-mini-transcribe`) + push-to-talk mic |
| 2 | Capture Forge voice | Output audio transcript finalize events |
| 3 | Preserve transcript order | `turnIndex` sequential append in `applyRealtimeTranscriptEvent` |
| 4 | Persist transcript | `lib/ce/transcript-store.ts` → localStorage + CE-M3 coachHistory |
| 5 | Verify accuracy | Automated order/shape checks + **Founder** live accuracy review |
| 6 | Evidence | This package |

---

## Acceptance criteria mapping

| Criterion | How verified |
|---|---|
| Founder transcript captured | Event `conversation.item.input_audio_transcription.completed` → role `founder` |
| Forge transcript captured | `response.output_audio_transcript.done` / `response.audio_transcript.done` → role `forge` |
| Ordered conversation history | `turnIndex` 0…n; UI ordered list; `summarizeTranscript.ordered` |
| Transcript persisted | `talkforge.ce_transcripts.v1` localStorage; Stop flushes |
| Available for CE-M3 coaching | `coachHistory: { role: user\|npc, text }[]` via `getCoachHistoryForVoiceSession` |

---

## Files

| Path | Role |
|---|---|
| `lib/ce/session-config.ts` | Input transcription on client_secrets + session.update |
| `lib/ce/transcript.ts` | Event → ordered turns + coach history mapping |
| `lib/ce/transcript-store.ts` | Persist / load / CE-M3 handoff |
| `lib/ce/realtime.ts` | session.update after connect; mic mute for PTT |
| `app/components/VoiceArena.tsx` | Transcript UI + Hold to Speak |
| `scripts/ce-m2-transcript-check.ts` | Unit check for order + coach shape |

---

## Automated verification (engineering)

```bash
npx --yes tsx scripts/ce-m2-transcript-check.ts
# expect ok: true, ordered, coachHistoryReady
```

---

## Engineering pre-check (not Founder acceptance)

Cloud agent browser @ `/voice` (no mic):

| Check | Result |
|---|---|
| Forge transcript captured | **PASS** — e.g. greeting + opening question as Forge #0 |
| Ordered list UI | **PASS** |
| Persisted after Stop | **PASS** — “persisted” + localStorage flush for CE-M3 |
| Founder transcript | **N/A in cloud** — requires Founder mic session |

Artifacts: `/opt/cursor/artifacts/ce-m2/`

---

## Founder validation protocol (authoritative)

Validation source: **Founder test sessions only** (per directive).

1. Open `http://localhost:3000/voice` on a machine **with a working microphone**.  
2. Press **Start** — allow mic.  
3. Confirm Forge speaks and a **Forge** transcript line appears.  
4. **Hold to Speak**, say a clear sentence (e.g. “I would clarify constraints before designing.”), release.  
5. Confirm a **Founder** transcript line appears with correct words (accuracy check).  
6. Exchange 2–3 more turns. Confirm order Founder/Forge alternation is sensible.  
7. Press **Stop**.  
8. In DevTools → Application → Local Storage → `talkforge.ce_transcripts.v1`:  
   - `turns` ordered  
   - `coachHistory` present with `user`/`npc` roles  
9. Record PASS/FAIL below.

| Founder check | Pass? | Notes |
|---|---|---|
| Forge transcript captured | | |
| Founder transcript captured | | |
| Transcript accuracy acceptable | | |
| Order preserved | | |
| Persisted after Stop | | |
| coachHistory ready for CE-M3 | | |

**Founder sign-off:** _______________  **Date:** _______________

---

## Explicit non-scope

- CE-M3 automatic coaching on transcript — **not started**  
- PCM ingest — CE-M5  
- Supabase remote transcript table — optional later (localStorage is CE-M2 MVP persist)

---

## Gate

CE-M3 must not begin until Founder signs CE-M2 acceptance above.
