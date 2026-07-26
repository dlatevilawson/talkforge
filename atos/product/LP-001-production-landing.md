# LP-001 — TalkForge Production Landing Page

| Field | Value |
|---|---|
| **Document ID** | LP-001 |
| **Version** | **2.0.0** |
| **Status** | Built in code — **awaiting Founder deploy approval** (do not deploy) |
| **Authority** | Executive Directive — Atlas Assignment 001 |
| **Domain (target)** | https://talkforge.io |
| **Preview (current prod alias)** | https://talkforge-virid.vercel.app — do **not** auto-promote |
| **Dependencies** | PCI-001, AMD-001, BETA-REC-002, LP-STORY-001, BP-001, KA-001 v2 |
| **Date** | 2026-07-26 |
| **Change Log** | v1.0 built; **v2.0 clarity-first leadership rewrite** (Assignment 001) |

> **Leadership rule:** Reduce Founder decisions; raise quality of the ones that remain.  
> **Deploy rule:** Prepare for talkforge.io — **never deploy without Founder approval.**

---

## Executive Summary

**Problem diagnosed:** v1 looked premium but led with aspiration (“Master the Art of Communication”). Visitors could not quickly explain *what TalkForge is*. The mechanism (“AI Communication Gym”) sat too far below the fold.

**Decision taken (Atlas):** Clarity before poetry in the first five seconds. Brand (official logo) remains the hero-level signal. The headline states the action; the supporting line names the product category. Redemption lines are protected — moved to Belief so they do not compete with product understanding.

**What ships in v2:** Rewritten `/` landing — minimal, elegant, fast — with official logo as brand centerpiece, product-clear hero, practice-floor visual plane, simplified IA, waitlist intact, talkforge.io metadata ready.

**Founder decisions remaining (only these):**

1. Approve copy tone (clarity-first hero) — or request one alternate headline.  
2. Approve deploy to talkforge.io when ready (after waitlist SQL + smoke).  
3. Optional later: share-test on a personal device before public push.

---

## Phase 1 — Understand

| Question | Answer (binding for v2) |
|---|---|
| **Who is the visitor?** | A capable adult with a conversation that matters coming up (interview, hard talk, leadership moment, negotiation) — or someone who has felt unprepared before. Not a “broken” person. |
| **What problem brought them?** | Advice is everywhere; **practice** is rare. They fear underperforming when it counts. |
| **Understand in five seconds?** | TalkForge is an **AI Communication Gym** — you **practice** real conversations with Forge before the moment arrives. |
| **What action?** | Primary: join the **Founding Members waitlist**. Secondary: **See TalkForge in Action** (`/welcome`). |

### Dignity constraints (AMD-001 / LP-STORY)

- Recognition → Relief → Possibility → Practice  
- No shame, diagnosis labels, fake scarcity, or savior product  
- Protect: *You weren’t born a poor communicator…* · *Nobody should ever feel voiceless…* · *AI Communication Gym*

---

## Phase 2 — Benchmark Report (principles only)

Studied patterns from high-clarity SaaS / product landing practice (industry literature + field norms). **Do not copy layouts or wording.**

| Principle | Evidence / rationale | TalkForge application |
|---|---|---|
| **P1 — Answer “What is this?” in ≤5s** | Above-the-fold research consistently ranks clarity over cleverness | Hero names **AI Communication Gym** + practice action |
| **P2 — Outcome headline, concrete subhead** | Outcome-led headlines outperform vague brand poetry | H1 = practice the conversations that matter; sub = product + Forge |
| **P3 — One primary CTA** | Multiple equal CTAs dilute action | Primary waitlist; secondary demo is quieter |
| **P4 — Show the product** | SaaS is invisible without a visual of use | Full-bleed practice-floor visual plane (not tip collage) |
| **P5 — Trust without fiction** | Fake logos/testimonials destroy trust when early-stage | Honest founding cohort + belief; no invented social proof |
| **P6 — One job per section** | Cognitive load kills retention | Belief / How / Founding / Waitlist / FAQ each single-purpose |
| **P7 — Performance & a11y** | Slow/inaccessible pages fail before copy is read | System fonts via `next/font`, reduced-motion, focus states, semantic FAQ |
| **P8 — Autonomy (SDT)** | Controlling CTAs harm motivation quality (Connection Science / SDT) | Dual path; no countdown scarcity |

**Benchmarks studied as exemplars of principles (not to imitate):** clarity-first SaaS heroes that name category + outcome; calm editorial brands that lead with identity then mechanism; practice/education products that show the “floor,” not feature grids.

**Adoption Test (BP-001):** Evidence of clarity principles = Industry Practice / Strong; mission align = Yes; measurable value (comprehension + waitlist) = Yes → **Adapt**.

---

## Phase 3 — Design Strategy

### Messaging hierarchy

1. **Brand** — TalkForge logo (official SVG)  
2. **Category** — AI Communication Gym  
3. **Action / outcome** — Practice the conversations that matter  
4. **Mechanism** — Rehearse with Forge before the real moment  
5. **Belief / redemption** — Protected lines (Belief section)  
6. **Invitation** — Founding Members waitlist  

### Visual hierarchy

| Layer | Choice | Why |
|---|---|---|
| Atmosphere | Cool mist + steel ink (not purple, not cream/terracotta) | Calm competence; distinct from AI cliché |
| Brand | Oversized official logo centerpiece in hero | Brand test: page still TalkForge without nav |
| Type | Fraunces (display) + Manrope (UI) | Expressive, not default Inter/system |
| Hero media | Full-bleed practice-floor plane | Real visual anchor = practice, not abstract cards |
| Motion | Reveal + gentle atmosphere drift (2–3) | Presence, not noise; `prefers-reduced-motion` |

### Information architecture

```
Nav
Hero (what + CTA + visual)
How it works (3 steps)
Belief (redemption + mission line)
Founding Members (why join now — honest)
Waitlist (conversion)
FAQ (objections)
Footer
```

### CTA strategy

| CTA | Role |
|---|---|
| Join the Founding Waitlist | Primary — email capture |
| See TalkForge in Action | Secondary — comprehension via `/welcome` |

### Trust & social proof

| Signal | v2 approach |
|---|---|
| Early-stage honesty | “Founding Members help shape the floor” — no fake customer logos |
| Mission trust | Belief quote |
| Product trust | Clear mechanism + demo path |
| v2+ | Real member quotes only when earned (Internal Evidence) |

### Accessibility & performance

- Semantic headings, FAQ buttons with `aria-expanded`  
- 44px+ tap targets; visible focus  
- `next/font` display=swap; no heavy hero video  
- Respect `prefers-reduced-motion`  

---

## Phase 4 — Landing Page Architecture (implementation map)

| Route / file | Role |
|---|---|
| `app/page.tsx` | Metadata + fonts + `<LandingPage />` |
| `app/components/landing/LandingPage.tsx` | Page composition |
| `LandingNav.tsx` | Fixed nav |
| `TalkForgeLogo.tsx` | Official mark + wordmark |
| `public/brand/talkforge-logo.svg` | Official full logo asset |
| `public/brand/talkforge-mark.svg` | Mark asset |
| `WaitlistForm.tsx` + `api/waitlist` | Conversion |
| `FaqAccordion.tsx` | Objections |
| `Reveal.tsx` | Motion |
| `app/opengraph-image.tsx` | Share card (clarity-aligned) |

---

## Content Draft (v2 — shipped)

### Hero
- **Logo:** Official TalkForge logo  
- **H1:** Practice the conversations that matter.  
- **Sub:** TalkForge is an AI Communication Gym. Rehearse with Forge — then walk into the real moment ready.  
- **Primary CTA:** Join the Founding Waitlist  
- **Secondary CTA:** See TalkForge in Action  

### How it works
1. **Practice** — Rehearse the talk that matters with Forge.  
2. **Improve** — Get coaching grounded in what you actually said.  
3. **Transfer** — Take the reps into real conversations and relationships.  

### Belief
- Lead: *You weren’t born a poor communicator. Nobody ever taught you how to practice.*  
- Peak: *Nobody should ever feel voiceless because they don’t know how to express themselves.*  

### Founding / Waitlist
- Help build the world’s communication gym.  
- Reserve your place on the floor.  
- Microcopy: No spam. No fake scarcity. Founding updates when the floor opens.

### Metadata
- Title: TalkForge — AI Communication Gym  
- Description: names gym + practice + founding waitlist  

---

## Implementation Plan

| Step | Owner | Status |
|---|---|---|
| 1. Diagnose v1 clarity failure | Atlas | Done |
| 2. Benchmark principles | Atlas | Done |
| 3. Lock strategy (this doc) | Atlas | Done |
| 4. Implement `/` v2 in code | Atlas | Done (this sprint) |
| 5. Typecheck + production build | Atlas | Required before PR complete |
| 6. Founder mobile share-test | Founder | Pending |
| 7. Run `supabase/waitlist.sql` if not applied | Founder | Pre-deploy |
| 8. Deploy + attach talkforge.io | Founder only | **Gated** |

### Deployment instructions (Founder-approved only)

Do **not** run until the Founder explicitly approves.

1. Supabase → run `supabase/waitlist.sql`  
2. `npx vercel deploy --prod --yes` (project `dlatevilawson-7440s-projects/talkforge`)  
3. Attach `talkforge.io` + `www` in Vercel Domains; configure DNS; wait for SSL  
4. Smoke: landing, `/welcome`, waitlist insert, Privacy/Terms, OG share  

---

## Phase 5 — Self-Assessment

| Lens | Assessment |
|---|---|
| **Strengths** | Product explainable in one breath; logo-led brand; dignity preserved; Founder decisions reduced to approve/deploy |
| **Weaknesses** | No live user testimonials yet; practice-floor visual is designed atmosphere, not a production screenshot; IE on conversion unknown |
| **Risks** | Clarity-first headline may feel less “premium poetic” to some; `/welcome` demo quality still bounds secondary CTA; waitlist inactive until SQL/deploy |
| **Alternatives considered** | (A) Keep “Master the Art…” as H1 — **rejected** (failed 5s product test). (B) Feature grid hero — **rejected** (hero budget / clutter). (C) Fake logo bar — **rejected** (honesty). |
| **v2 improvements** | Real session screenshot when CE UI is share-ready; 1–2 founding quotes; A/B hero sub length; optional curiosity-gap line (EXP-LP-01) after IE |

### Founder yes/no checklist

| Question | Atlas counsel |
|---|---|
| Understand what TalkForge is in 5 seconds? | **Designed so yes** — gym + practice named in hero |
| Create trust? | Honest founding + belief; no fake proof |
| Align with mission? | Yes — practice → readiness → voice |
| Confidently share with someone you care about? | Share-test on Founder device recommended |
| Clear reason to join? | Founding access + shape the product |

---

## Assumptions & open questions

| ID | Item | Type |
|---|---|---|
| A-01 | Visitors arrive cold (no brand memory) | Assumption |
| A-02 | Waitlist is correct primary conversion pre-CE MVP | Assumption |
| Q-01 | Does “Communication Gym” read clearly to non-athletes? | Open — watch qualitative share-test |
| Q-02 | Primary CTA wording: “Founding Waitlist” vs “Join Waitlist” | Open — either acceptable; shipped Founding for belonging |
| Q-03 | When to promote demo CTA above waitlist | Open — after `/welcome` craft passes share-test |

---

## Local verification

```bash
npm run typecheck
npm run build
```

| Field | Value |
|---|---|
| **Status Upon Signature** | v2 built — waiting Founder deploy approval |
