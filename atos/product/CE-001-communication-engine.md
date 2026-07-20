# CE-001 — Communication Engine v1.0 (Voice Architecture)

| Field | Value |
|---|---|
| **Document ID** | CE-001 |
| **Version** | 1.0.0 |
| **Status** | **Approved for Execution** (Critical) — RES-013 / DIR-CE-001 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Per milestone close / DIR-CE-001 exit |
| **Dependencies** | FLA-001, DIR-CE-001, RES-013, PCM-001, RES-012 |
| **Related Documents** | PPS-001 (gated), `app/api/coach/route.ts`, `lib/transfer.ts`, `app/prepare/page.tsx` |
| **Approval History** | 2026-07-20 — Design issued; 2026-07-20 — Founder Approved for Execution (RES-013) |
| **Change Log** | 2026-07-20 — Bound Critical priority; PPS-001 gated on CE MVP |

> **Authority:** Founder-authorized engineering of TalkForge’s foundational voice interaction layer. Built **on** ATOS. **No** Atlas Organization changes. **No** constitutional amendments. Loader freeze / `FOUNDER_VISIBLE` untouched. Every decision must comply with **FLA-001**. Binding directive: [`DIR-CE-001-founder-directive.md`](DIR-CE-001-founder-directive.md).

---

## 0. Executive summary

TalkForge’s Communication Engine makes practice feel like a **real interview conversation**: voice in, voice out, natural turn-taking — while preserving FLA’s evidence chain.

**Chosen architecture:** Hybrid voice pipeline.

| Layer | Role |
|---|---|
| **Realtime voice (WebRTC)** | Natural interviewer (NPC) dialogue with barge-in |
| **Transcripts (canonical text)** | Evidence substrate for coaching + PCM |
| **Forge Coach (structured JSON)** | FLA coaching contract on finalized user turns |
| **PCM-001** | Ingests transcripts + coaching + reality; returns next-sim priorities |

Pure speech-to-speech without transcripts would violate FLA evidence rules. Text-only remains available as fallback; **voice is the primary practice surface for PPS-001 wedge sessions**.

---

## 1. End-to-end voice system architecture

### 1.1 Context diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        TalkForge Client                          │
│     /prepare → Event → VoiceArena (mic / speaker / Forge cards)  │
└───────────────┬──────────────────────────────┬───────────────────┘
                │ WebRTC + data channel        │ HTTPS JSON
                ▼                              ▼
┌────────────────────────────┐   ┌─────────────────────────────────┐
│ OpenAI Realtime (NPC)      │   │ Next.js API Routes              │
│ • speech↔speech interviewer│   │ • POST /api/realtime/session    │
│ • input/output transcripts │   │ • POST /api/coach (FLA)         │
└───────────────┬────────────┘   │ • POST /api/pcm/* (ingest)      │
                │ transcripts    └───────────────┬─────────────────┘
                ▼                                ▼
         ┌──────────────────────────────────────────────┐
         │ Supabase                                      │
         │ practice_sessions · turns · pcm_* · profiles  │
         └──────────────────────────────────────────────┘
```

### 1.2 Logical components

| Component | Responsibility | Non-responsibility |
|---|---|---|
| **CE Session Manager** | Ephemeral Realtime token, WebRTC lifecycle, turn state machine | Coaching judgment |
| **NPC Voice Agent** | Plays interviewer; stays in scenario; never coaches in audio | Forge coaching content |
| **Transcript Pipeline** | Finalizes user/NPC text; attaches turnIndex | Identity inference |
| **Forge Coach** | FLA contract JSON from transcript + PCM context | Speaking as interviewer |
| **PCM Adapter** | `ingestTurn` / `ingestCoach` / `getCoachContext` | UI for competencies |
| **Session Store** | Persist turns, link eventId, complete → reflect → reality | Atlas governance |

### 1.3 Architectural decision: Hybrid (binding for v1)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. Pure Realtime S2S (one model does all) | Lowest latency | Hard to enforce FLA JSON coach; weak evidence citations | Reject for coach path |
| B. Chained Whisper → text coach → TTS | Full control; reuses `/api/coach` | Higher latency; less natural barge-in | Fallback / offline |
| **C. Hybrid: Realtime NPC + transcript → Forge Coach** | Natural interview + FLA evidence | Two paths to sync | **Adopt** |

**Rule:** NPC audio may be generative and fluid. **Coaching claims may only cite finalized transcripts** (and reality/reflection). Competencies stay invisible.

### 1.4 Stack mapping (existing)

| Need | Choice |
|---|---|
| App | Next.js App Router (current) |
| Auth / DB | Supabase (profiles, sessions); extend for PCM + turn audio meta |
| LLM coach | Existing OpenAI Responses path in `/api/coach` |
| Voice transport | OpenAI Realtime API over **WebRTC** in browser |
| Secrets | Server mints **ephemeral** Realtime client secret; never expose `OPENAI_API_KEY` |
| Hosting | Vercel-compatible; HTTPS required for mic in production |

### 1.5 FLA compliance matrix

| FLA doctrine | CE-001 enforcement |
|---|---|
| Performance Laboratory | Voice interview immersion; fear not removed — practiced through |
| Events Are the Interface | Voice session requires `eventId` from `/prepare` |
| Evidence-based coaching | Coach only after transcript finalize; `evidence` field mandatory |
| Reality completes loop | Unchanged: reflect → reality → PCM.applyReality |
| Utility before transformation | V1 = technical interview voice only |
| Behaviors not identities | System prompts + output validation |
| Transfer North Star | Session success = event readiness + reality path, not talk-time |

---

## 2. User conversation flow (mic tap → AI response)

### 2.1 Happy path (voice-first practice)

```
1. User completes /prepare (names technical interview event)
2. Lands on VoiceArena with event context preloaded
3. Taps primary control: Hold / Tap to talk  (user gesture → getUserMedia)
4. CE Session Manager:
   a. POST /api/realtime/session { eventId, track, sessionId }
   b. Receives ephemeral key + session config (NPC instructions)
   c. Establishes RTCPeerConnection; attaches mic track
5. NPC greets in voice (scenario opening line) + transcript appears subtly
6. User speaks (VAD / push-to-talk ends turn)
7. Realtime emits finalized user transcript
8. Client appends { role:user, text, turnIndex } to session turns
9. PCM.ingestTurn(user transcript)
10. Parallel:
    A. NPC continues via Realtime (next interviewer move) — natural conversation
    B. POST /api/coach { message, history, scenario, event, pcmContext }
11. Forge card updates (doneWell / improve / whyItMatters / evidence)
    — visual by default during immersion; optional short TTS later (post-MVP)
12. User may barge-in on NPC (WebRTC); interrupted NPC audio stops
13. Loop 6–12 until user ends mission
14. completePracticeSession → /reflect → /reality (existing PPS loop)
15. PCM.applyReality updates next-sim priorities
```

### 2.2 Turn state machine

```
idle → connecting → listening → user_speaking → finalizing_transcript
    → coaching (async) → npc_speaking ↔ user_speaking (barge-in)
    → paused → ended
```

| State | Mic | Speaker | UI |
|---|---|---|---|
| idle | off | off | Big “Start voice practice” |
| connecting | pending | off | Spinner + permission copy |
| listening | on (VAD) | idle | Pulse ring “Your turn” |
| user_speaking | on | off | Waveform |
| finalizing_transcript | on/off | off | “Capturing what you said…” |
| coaching | — | optional | Forge card skeleton → filled |
| npc_speaking | hot for barge-in | on | Interviewer indicator |
| paused | off | off | Resume / End |
| ended | off | off | Route to reflect |

### 2.3 Push-to-talk vs continuous VAD (MVP choice)

| Mode | When |
|---|---|
| **Push-to-talk (default MVP)** | Reliable turn boundaries; better transcripts for evidence; less accidental barge noise |
| Continuous VAD | Post-MVP polish once transcript quality proven |

Natural conversation still holds: NPC speaks fluidly; user controls when their answer is “committed” for coaching evidence.

### 2.4 Failure paths

| Failure | User-visible | System |
|---|---|---|
| Mic denied | Clear permission instructions; offer text fallback | No session burn |
| Realtime connect fail | “Voice unavailable — continue in text?” | Log; text TrainingArena |
| Transcript empty | “I didn’t catch that — try again” | No coach call |
| Coach fail | Conversation continues; coach card “retry” | NPC path independent |
| Network drop | Pause + reconnect once; else save partial session | Persist turns so far |

---

## 3. Technical implementation plan (Next.js · Supabase · OpenAI)

### 3.1 New modules (proposed paths)

```
app/api/realtime/session/route.ts   # mint ephemeral Realtime session
app/api/pcm/ingest/route.ts         # optional server ingest (or client→supabase)
app/voice/page.tsx                  # entry redirect with event query
app/components/VoiceArena.tsx       # voice-first practice UI
lib/ce/realtime.ts                  # WebRTC connect helpers
lib/ce/session-config.ts            # NPC instructions from event + track
lib/ce/transcript.ts                # normalize Realtime transcript events
lib/pcm/client.ts                   # PCM ingest/read (MVP local+supabase)
```

Reuse:

- `createPracticeSession` / `persistActiveSession` / `completePracticeSession`  
- `/api/coach` FLA JSON contract (extend with `pcmContext`)  
- `/prepare`, `/reflect`, `/reality`, `lib/transfer.ts` event linking  

### 3.2 `POST /api/realtime/session`

Server-only:

1. Validate auth / guest user + `eventId` + `track`  
2. Build NPC system instructions (interviewer only; **never** emit coaching in voice)  
3. Call OpenAI Realtime sessions API with `OPENAI_API_KEY`  
4. Enable **input audio transcription** (and output transcription if available)  
5. Return ephemeral client secret + model/voice ids to browser  

**NPC instruction constraints (FLA):**

- Stay in technical interview role for the track  
- Probe like a real interviewer  
- Do not compliment identity; do not coach  
- Keep turns short enough for practice density  

### 3.3 Client WebRTC

1. User gesture → `getUserMedia({ audio: true })`  
2. Create peer connection; add mic track  
3. Data channel for Realtime events (transcripts, speech started/stopped)  
4. Play remote audio track (NPC)  
5. On `conversation.item.input_audio_transcription.completed` (or equiv): finalize user text → coach + PCM  

Exact event names follow current OpenAI Realtime docs at implementation time — wrap in `lib/ce/transcript.ts` so UI does not depend on vendor string drift.

### 3.4 Coach integration

After each finalized user transcript:

```ts
await fetch("/api/coach", {
  body: JSON.stringify({
    message: userTranscript,
    history: textHistory, // user+npc only
    scenario: { ...trackScenario },
    event: { ...forgeEvent },
    pcmContext: await pcm.getCoachContext(userId, eventId),
  }),
});
```

Extend coach system prompt:

- Prefer active PCM priorities when evidenced  
- Still require `evidence` citing **this** transcript  
- Never invent PCM patterns  

### 3.5 Supabase schema additions (milestone CE-M2+)

| Table | Purpose |
|---|---|
| `pcm_observations` | Append-only evidence |
| `pcm_priorities` | Active next-sim focuses |
| `practice_sessions.event_id` | First-class event link (today: localStorage link) |
| `practice_turns` (optional) | Normalize turns if JSON column becomes heavy |

MVP may keep PCM in localStorage (like transfer) until schema migration ships — but **API shapes must match PCM-001**.

### 3.6 Security & privacy

- Ephemeral keys only in browser  
- No raw audio upload to Supabase in MVP (stream to OpenAI Realtime only)  
- Transcripts stored as session evidence (user-owned)  
- No third-party analytics on voice content in MVP  
- HTTPS in production  

### 3.7 Text fallback

If voice unavailable: existing `TrainingArena` text path with same event + coach + reality loop. Voice is primary CTA; text is accessibility / failure fallback — not a second product.

---

## 4. UI/UX — voice-first practice sessions

### 4.1 Design principles

1. **One composition:** Event title is the hero; mic control is the only primary action.  
2. **Interview immersion > dashboard chrome** during session.  
3. **Forge is coach, not co-interviewer** — cards secondary, not competing audio by default.  
4. **No gamification chrome** in VoiceArena (FLA / RES-012).  
5. **Transcript is evidence, not a chat toy** — collapsible, not the main plane.  
6. Motion: mic pulse (listening), soft waveform (speaking), card fade-in (coach) — purposeful only.

### 4.2 Screens

#### A. Pre-session (from `/prepare` → `/voice?event=…`)

- Event title, when, track  
- Success criteria (user’s words)  
- Single CTA: **Start voice practice**  
- Secondary: Practice in text instead  

#### B. VoiceArena (active)

```
┌────────────────────────────────────────────┐
│  Event: Acme Staff · System design · Thu   │
│                                            │
│           [ Interviewer speaking… ]        │
│                                            │
│              ╭──────────╮                  │
│              │  ● MIC   │  ← primary       │
│              ╰──────────╯                  │
│         Hold to speak · release to send    │
│                                            │
│  ┌ Forge ─────────────────────────────┐    │
│  │ Done well / Try this / Why / Evidence│   │
│  └────────────────────────────────────┘    │
│  [ Show transcript ]     [ End session ]   │
└────────────────────────────────────────────┘
```

#### C. Between turns

- Mic returns to “Your turn” pulse  
- Latest Forge card remains until next coach result  
- No XP, streaks, or confetti  

#### D. End session

- Confirm → existing reflect → reality capture  
- Copy: “Practice prepared you — reality completes the loop.”  

### 4.3 Accessibility

- Text fallback always one tap away  
- Captions/transcript toggle for NPC and user  
- Reduced-motion: disable waveform; keep state labels  
- Keyboard: Space = push-to-talk when focused  

### 4.4 Visual direction (product, not Atlas)

- Keep TalkForge dark practice aesthetic already in app  
- Avoid purple-glow “AI orb” cliché; mic control is a clear affordance, not a mascot  
- Brand name TalkForge remains visible in shell; event name dominates session  

---

## 5. Data flow — transcripts → PCM-001

```
Microphone audio
    → Realtime WebRTC
    → finalized user_transcript (canonical)
         ├→ practice session turns[]  (persist)
         ├→ PCM.ingestTurn(observation)
         └→ /api/coach (+ pcm.getCoachContext)
                → ForgeCoaching { evidence, whyItMatters, ... }
                → PCM.ingestCoach(observation + priorities refresh)
                → VoiceArena Forge card

NPC audio
    → Realtime
    → npc_transcript
         └→ session turns[] (context for coach; usually not PCM user patterns)

Reality capture
    → PCM.applyReality
    → next voice session loads updated priorities into NPC focus + coach prompt
```

### 5.1 What PCM learns from voice (v1)

| Signal | How |
|---|---|
| Structure skip | Coach evidence + optional behaviorCode |
| Hedge density | Observation tags from coach/heuristics later |
| Probe recovery | Pattern across turns when interrupted |
| Event readiness delta | Reality capture readiness before/after |

Competency weights (C-STRUCT, C-TRADE, …) update **internally** only.

### 5.2 Conflict rule

If simulation coach says “improve tradeoffs” but reality capture says “froze when interrupted,” **PCM prioritizes probe resilience** for the next session.

---

## 6. Engineering roadmap (small milestones)

| ID | Milestone | Outcome | Exit criteria |
|---|---|---|---|
| **CE-M0** | Design freeze | This doc + PCM-001 contract accepted for build | Founder/Atlas checklist green |
| **CE-M1** | Ephemeral session + WebRTC hello | Mic → NPC voice hello → disconnect cleanly | Demo on localhost HTTPS/secure context |
| **CE-M2** | Transcript finalize | User push-to-talk yields stable transcript in UI + session turns | Empty/partial handled |
| **CE-M3** | Coach on transcript | Each user turn → `/api/coach` → Forge card (FLA fields) | Evidence cites transcript |
| **CE-M4** | Event-wired VoiceArena | `/prepare` → `/voice` primary path; text fallback | Event required |
| **CE-M5** | PCM ingest MVP | Observations + priorities read into coach context | PCM-001 shapes honored |
| **CE-M6** | Persist + recover | Supabase (or hardened local) survives refresh mid-session | No silent data loss |
| **CE-M7** | PPS voice proof | ≥N wedge users complete voice → reflect → reality | Transfer funnel counts voice sessions |
| **CE-M8** | Hardening | Reconnect, permissions, cost caps, latency budget | Risk list mitigated |

**Ordering rule:** Do not start CE-M5 UI features, gamification, or new mission types before CE-M3. Do not expand beyond technical-interview wedge before CE-M7 signal.

### Suggested latency budgets (targets)

| Metric | Target |
|---|---|
| Mic tap → NPC first audio (cached session) | < 1.0s ideal / < 2.5s acceptable |
| User release → transcript visible | < 800ms |
| Transcript → Forge card | < 2.5s |
| Barge-in stop | < 200ms perceived |

---

## 7. Risks, tradeoffs, MVP scope

### 7.1 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Transcript quality poor → bad coaching evidence | High | Push-to-talk; show transcript; allow “edit before coach” later if needed |
| Realtime cost / long sessions | High | Session time caps; push-to-talk; end idle audio |
| Coach latency breaks immersion | Medium | Async cards; never block NPC path on coach |
| Dual-agent conflict (NPC vs Forge) | Medium | Hard split: NPC never coaches; Forge never plays interviewer |
| Browser mic / Safari quirks | Medium | Text fallback; test matrix CE-M1 |
| Privacy fear (voice leaving device) | High | Clear disclosure; no silent recording; HTTPS |
| Scope creep into full Agents SDK platform | Medium | CE-001 checklist only; no Atlas work |

### 7.2 Tradeoffs accepted

| Decision | Tradeoff |
|---|---|
| Hybrid over pure S2S | Slightly more engineering; FLA integrity preserved |
| Push-to-talk over free VAD | Slightly less “phone call”; much better evidence boundaries |
| Visual Forge during voice | Less “all audio”; protects interview immersion |
| Defer coach TTS | Voice-first for practice dialogue; coach voice later if transfer needs it |
| PCM local-first OK in M5 | Faster ship; migrate to Supabase in M6 |

### 7.3 MVP scope (in)

- Technical interview tracks only (existing three)  
- Event-required voice sessions  
- Push-to-talk user audio  
- Realtime NPC interviewer  
- Transcript → FLA coach card  
- PCM ingest + coach context (minimal)  
- Reflect + reality unchanged  
- Text fallback  

### 7.4 Explicitly out of MVP

- Free-form continuous always-on VAD as default  
- Multi-party / panel simulation  
- Mobile native apps  
- Voice coach interrupting every turn by default  
- Emotion/identity diagnostics from audio prosody  
- Enterprise recording / manager review  
- Gamification / XP in VoiceArena  
- Atlas runtime / FOUNDER_VISIBLE / loader changes  
- Non-interview mission voice expansion  

---

## 8. Implementation checklist (immediate Cursor development)

Use this as the engineering backlog. Check items in order.

### CE-M0 — Align

- [ ] Read FLA-001, PPS-001, PCM-001, this CE-001  
- [ ] Confirm no Atlas/governance files will be edited for voice work  
- [ ] Add `CE-001` / `PCM-001` to product README + PPS progress note  

### CE-M1 — Realtime hello

- [ ] `app/api/realtime/session/route.ts` — ephemeral session; server uses `OPENAI_API_KEY`  
- [ ] `lib/ce/session-config.ts` — NPC interviewer instructions per track + event  
- [ ] `lib/ce/realtime.ts` — WebRTC connect/disconnect helpers  
- [ ] Minimal `VoiceArena` prototype: Start → hear NPC line → Stop  
- [ ] Manual test: Chrome localhost mic permission  

### CE-M2 — Transcripts

- [ ] `lib/ce/transcript.ts` — normalize vendor transcript events  
- [ ] Push-to-talk UI (press/hold or tap-to-lock)  
- [ ] Append finalized user + NPC text to session turns via existing session helpers  
- [ ] Handle empty transcript / retry  

### CE-M3 — FLA coach on voice turns

- [ ] On transcript finalize → call existing `/api/coach`  
- [ ] Pass `event` + history built from transcripts  
- [ ] Render Forge card (`whyItMatters`, `evidence` required in UI)  
- [ ] Ensure NPC audio path does not wait on coach  

### CE-M4 — Event-first voice entry

- [ ] `/prepare` primary CTA → `/voice?event=&track=&mission=1`  
- [ ] Require `eventId`; block voice start without event  
- [ ] Link session↔event (`lib/transfer` + plan Supabase `event_id`)  
- [ ] Text fallback button → existing `TrainingArena` / interview text  

### CE-M5 — PCM MVP

- [ ] Implement `lib/pcm/client.ts` per PCM-001 shapes  
- [ ] `ingestTurn` + `ingestCoach` after each coached turn  
- [ ] `getCoachContext` wired into `/api/coach`  
- [ ] Reality capture calls `applyReality` (priority refresh)  

### CE-M6 — Persistence & reliability

- [ ] Supabase tables for PCM (or documented local→remote migration)  
- [ ] Reconnect once on WebRTC drop; save partial session  
- [ ] Cost/duration guardrails (max session minutes)  

### CE-M7 — Proof instrumentation

- [ ] Tag sessions `modality: voice | text`  
- [ ] Transfer dashboard counts voice sessions separately  
- [ ] Collect N instrumented voice → reality loops for PPS-001  

### Definition of done (CE-001 v1 implemented)

1. User can prepare an interview event and complete a **voice** practice loop.  
2. Every Forge coaching claim cites transcript evidence.  
3. Transcripts and coaching flow into PCM priorities for the next session.  
4. Reflect → reality path still works.  
5. No Atlas org / governance changes landed.  

---

## 9. Relationship to PPS-001 (RES-013)

Per **DIR-CE-001 / RES-013**: Product Proof Sprint 001 **may not begin** until CE-001 reaches **MVP readiness**.

CE-001 is not a workstream inside an active PPS — it is the **prerequisite**. PPS-001 status is **Gated** until that gate opens.

| After CE MVP | CE-001 contribution to PPS |
|---|---|
| Event-first entry | Voice requires event |
| Technical interview sims | NPC voice interviewer |
| Evidence-based coach | Transcript-grounded FLA coach |
| Reality capture | Feeds PCM |
| Transfer instrumentation | Voice modality + funnel |

---

## 10. Non-amendments (explicit)

- Atlas Constitution / Organization v1.0 — **preserved**  
- ATOS Maintenance Mode — **unchanged**  
- RES-010 / RES-011 / RES-012 — **unchanged**  
- No new AIO offices  

| Field | Value |
|---|---|
| **Status Upon Signature** | Approved for Execution (Critical) — implement per §8 checklist under DIR-CE-001 |
