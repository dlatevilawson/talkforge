# BR-001 — Beta Readiness Assessment

| Field | Value |
|---|---|
| **Document ID** | BR-001 |
| **Version** | 1.0.1 |
| **Status** | **Accepted** (Authoritative) |
| **Authority** | Founder Accepted — RES-015 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Dependencies** | MR-001 / RES-014, DIR-CE-001 / RES-013, CE-001, DEC-CE-M2-UX, FLA-001, RES-015 |
| **Related Documents** | ATLAS-HANDOFF-REGISTER, PPS-001 (still Gated), RES-015 |
| **Approval History** | 2026-07-21 — Assessment issued; **2026-07-21 — Founder Accept (RES-015)** |
| **Change Log** | 2026-07-21 — v1.0.0 assessment; v1.0.1 Accepted — NOT READY binding; **v1.0.2 DEPLOY-001: this app live at talkforge-virid.vercel.app; old host abandoned** |

> **Objective:** Prepare TalkForge so a small group of real users can use the application on their phones for one week.  
> **Not the objective:** Build more features for their own sake.  
> **Lens:** First-time user, not developer.  
> **Governance:** MR-001 checkpoint — reinforce mission; no new frameworks; CE Critical path remains the substrate.

---

## 1. Executive Summary

TalkForge’s **in-repo product** (Next.js Communication Engine + gym surfaces) can start a voice practice session locally, preserve transcripts, and present a calmer presence UX after DEC-CE-M2-UX.

It is **not ready** to invite external users via a text-message link.

**Primary blocker (updated 2026-07-21):** ~~There is no public deployment of this application.~~ **Mitigated by DEPLOY-001:** this Next.js TalkForge is live at **https://talkforge-virid.vercel.app** under the Founder’s accessible Vercel account. The hostname `https://talkforge.vercel.app` remains a **different product** and is **abandoned for beta** (not owned by the accessible account — do not chase).

**Remaining blockers for a one-week phone beta:**

1. Voice session **End** does not complete a user-visible learning loop (no CE-M3 coaching handoff → reflect/reality).  
2. First-run product language still mixes **strategy jargon**, **infrastructure names**, and **interview-as-identity** CTAs.  
3. Mobile mic / Safari / PTT behavior still needs **Founder/device smoke** on the new HTTPS URL.

**Final recommendation: NOT READY**

A supervised Founder-only test on localhost (or a private preview after deploy) is possible. An external text-link beta is not.

---

## Phase 1 — Founder Journey (text-link simulation)

Assumed invite: SMS → link → phone browser.

### Path A — Link to `https://talkforge.vercel.app` (current public host)

| Step | Observation | Would a first-time user know what to do? |
|---|---|---|
| Open link | HTTPS works; loads a polished static site (“Less advice. More reps.” / Signal Room) | Partially — different product narrative |
| Find Forge voice gym | `/voice`, `/dashboard`, `/prepare` → **404** | **No** — core app missing |
| Mic / CE voice | Not this codebase’s Realtime CE | N/A — wrong product |

**Verdict Path A:** External invite to the current public URL does **not** test TalkForge CE.

### Path B — This repo locally (`http://localhost:3000`, mobile viewport ~390px)

| Step | Observation | Know what to do? |
|---|---|---|
| Open home | Brand + “AI Communication Gym” clear; hero strong | **Yes** for “what is this?” |
| Primary CTA | “Prepare for an Interview” → `/prepare` form | Mostly — but interview framing overpowers gym identity (MR-001 risk) |
| Prepare form | Multiple fields; required fields unclear until submit fails | Weak — friction before first taste of Forge |
| Alternate path | Nav: Dashboard / Prepare / Voice / Practice / Progress / Profile (+ Atlas in **dev only**) | Weak — too many doors |
| Dashboard | Stats zeros + “V1 wedge / North Star” + “Connected to Supabase” | **No** — sounds like an internal brief |
| `/voice` Begin | Session mints; Forge speaks; presence orb; hold-to-speak | **Yes** once on the page |
| Mic | Cloud VM: silent fallback message (honest). Real phone unproven on public HTTPS of *this* app | Partial |
| End session | Disconnects; no coaching card / reflect / “come back tomorrow” | Weak — incomplete gym visit |
| Diagnostics | Footer “Diagnostics” still visible (collapsed) | Mild trust ding |
| Trust in 30s | Warm Forge greeting helps; little social proof / outcome story | Partial |

Evidence artifacts (local + public probe): `/opt/cursor/artifacts/br-001/`  
(homepage, prepare, voice coach greeting, dashboard jargon, public 404 on `/voice`).

---

## Phase 2 — Beta Readiness Audit

Issues ranked **highest → lowest impact** within each band.

### Critical (block successful use)

| Rank | Issue | Impact |
|---|---|---|
| C1 | ~~**This TalkForge app is not publicly deployed.**~~ **Mitigated (DEPLOY-001):** live at https://talkforge-virid.vercel.app. Old host abandoned. | Was: users cannot open product |
| C2 | ~~**No production HTTPS host for CE mic path.**~~ **Mitigated** — HTTPS on new project; **device mic still unverified**. | Voice on phone still pending smoke |
| C3 | **Voice session completion loop incomplete for beta value.** End stops WebRTC; no CE-M3 evidence coaching → reflect/reality → reason to return next day. | Users may try once and leave with “cool demo,” not a gym habit |

### High Priority (confidence / confusion)

| Rank | Issue | Impact |
|---|---|---|
| H1 | Dashboard shows strategy/infra copy (“V1 wedge”, “North Star”, “Connected to Supabase”) | Feels unfinished / internal |
| H2 | Home primary CTA = “Prepare for an Interview” (wedge as identity) | Conflicts with MR-001 language discipline |
| H3 | Competing start paths: Prepare form vs Voice vs Practice missions vs “Begin with Forge” | First user unsure which door is *the* door |
| H4 | Nav overload on mobile (6+ items); Practice vs Voice unclear | Cognitive load |
| H5 | “Diagnostics” affordance still on voice surface | Trust / polish |
| H6 | Guest-only “Sign In”; auth copy mentions Supabase | Unclear account story for a week-long test |
| H7 | Prepare required fields not marked; validation easy to miss on phone | False starts |

### Medium Priority (polish; do not block if Criticals fixed)

| Rank | Issue | Impact |
|---|---|---|
| M1 | Empty-state zeros on dashboard feel cold | Motivation |
| M2 | No post-session “you did X; try again tomorrow” closure | Return probability |
| M3 | Hold-to-speak discoverability / iOS gesture edge cases untested on device | Partial sessions |
| M4 | Score display clarity (“sessions · avg score”) | Comprehension |
| M5 | Mission picker expands surface area beyond V1 beachhead | Dilutes focus |

### Low Priority (must not delay beta)

| Rank | Issue | Impact |
|---|---|---|
| L1 | Visual polish consistency across shells | Aesthetic |
| L2 | Social proof / testimonials on marketing home | Trust nicety |
| L3 | Full account system beyond guest | Premature for small beta |
| L4 | CE-M6–M8 hardening (reconnect, cost) | Post-invite iteration |
| L5 | Atlas nav in `NODE_ENV=development` only | Not a production issue once this app is deployed as production |

**Note:** Atlas in local nav is **dev-only** (`AppShell`). Not a production Critical for a proper `next start` / Vercel production deploy of *this* repo. Do not confuse with C1.

---

## Phase 3 — Beta Readiness Checklist

| Item | Status | Notes |
|---|---|---|
| Public deployment (this app) | ✅ Complete | **https://talkforge-virid.vercel.app** (DEPLOY-001). Old `talkforge.vercel.app` abandoned. |
| Mobile accessibility | 🟡 Needs Improvement | Layout OK; real-phone pass still required on new URL |
| HTTPS | ✅ Complete | Vercel HTTPS on new project |
| Microphone permissions | 🟡 Needs Improvement | API mint works in prod; device prompt unproven |
| Voice conversations | 🟡 Needs Improvement | Session mint OK in prod; full duplex on phone pending |
| Responsive UI | 🟡 Needs Improvement | Generally usable at 390px; nav crowded |
| Loading performance | 🟡 Needs Improvement | Prod responds; no RUM yet |
| First-time onboarding | 🔴 Blocking | Unclear single path; jargon; form friction before first win |
| Error handling | 🟡 Needs Improvement | Some errors surface; recovery/return path thin |
| Session completion | 🔴 Blocking | End ≠ complete gym loop (coach/reflect/return) |
| Conversation quality | 🟡 Needs Improvement | Warm coach-first voice present; FLA coaching cards not yet on voice (CE-M3) |
| Founder confidence | 🟡 Needs Improvement | Correct link exists; still need phone smoke + completion/trust before unsupervised invite |

---

## Phase 4 — First User Experience (30 seconds)

| Question | Clear today? | Improvement (mission-aligned) |
|---|---|---|
| 1. What is TalkForge? | **Mostly yes** on home (“AI Communication Gym”) | Keep brand/gym framing; avoid interview-as-title |
| 2. What am I supposed to do? | **Unclear after home** | One primary action: “Practice with Forge” |
| 3. How do I start? | **Partially** | One path: name a real upcoming conversation → Begin (or skip-to-voice with a default event) |
| 4. Why trust this coach? | **Weak** | Coach-first tone helps; remove diagnostics/jargon; show one concrete coaching moment after first session |

---

## Phase 5 — Beta Launch Recommendation

# NOT READY

Critical blockers remain before inviting external users.

This is **not** a doctrine problem. It is an **access + completion + trust** problem.

PPS-001 remains **Gated** (RES-013). BR-001 does not lift that gate. A small usability beta is still allowed in principle once Criticals clear, but must not be confused with Product Proof.

---

## 6. Recommended Action Plan

Ordered for **highest impact on invite confidence**. No new frameworks. Build on CE + MR-001.

| Order | Action | Band | Why it raises invite probability |
|---|---|---|---|
| 1 | ~~**Deploy this Next.js TalkForge**~~ **Done (DEPLOY-001)** — https://talkforge-virid.vercel.app | Critical → ✅ | Correct link exists |
| 2 | **Smoke-test on real iPhone + Android** on the new URL: open link → mic prompt → Forge speaks → hold-to-speak → End. | Critical | Phone is the stated environment |
| 3 | **Define a minimal “session complete” for beta** (even thin): End → short coaching from transcript (CE-M3 intent) or clear next step + save — so users feel a finished practice. | Critical | Return requires a closed loop |
| 4 | **Strip beta-facing jargon**: remove/hide Supabase banner, V1/North Star dashboard copy; hide Diagnostics by default with no primary affordance (or remove for beta). | High | Trust |
| 5 | **One obvious start path** on home + dashboard; soften interview-as-identity CTA per MR-001. | High | 30-second clarity |
| 6 | Simplify mobile nav for beta (Voice / Prepare / Progress enough). | High | Reduce wrong doors |
| 7 | Then invite **3–7** users for one week with a written script: what TalkForge is, what to try daily, how to report broken mic/voice. | — | Meaningful feedback |
| 8 | Medium/Low polish only after invites are unblocked. | Med/Low | Do not delay |

**Priority posture (RES-014 / DIR-CE-001):**  
CE remains the substrate. BR-001 work that unblocks phone beta (deploy, session completion/coaching handoff, trust copy) is the **highest execution priority after the current CE milestone** — it must not spawn parallel frameworks or Atlas thaw.

---

## 7. Final Beta Recommendation

| Field | Value |
|---|---|
| **Decision** | **NOT READY** |
| **Why** | No public deploy of this product; incomplete voice session completion loop; phone mic/trust path unproven on the correct host; first-run clarity insufficient for unsupervised users |
| **What “ready enough” looks like** | Correct HTTPS link → first-time user starts voice in &lt;60s → Forge conversation works on phone → session ends with understandable coaching/next step → Founder would text the link without a disclaimer |
| **PPS-001** | Still **Gated** — unchanged |
| **MR-001** | Still the governance checkpoint for significant new ideas |

### Founder Acceptance (RES-015)

**Status: ✅ Accepted**

- Recommendation **NOT READY** is binding until Critical blockers clear and Founder reassesses.  
- Do not invite external users via text link until then.  
- No doctrine changes. No new frameworks. PPS-001 remains gated.

| Field | Value |
|---|---|
| **Status Upon Signature** | **Accepted** — NOT READY binding (RES-015) |
