# LP-001 — TalkForge Production Landing Page

| Field | Value |
|---|---|
| **Document ID** | LP-001 |
| **Version** | **3.0.0** |
| **Status** | Built — **awaiting Founder deploy approval** |
| **Authority** | [BRAND-001 v2](BRAND-001-talkforge-brand-directive.md) · Atlas Assignment 001 |
| **Domain (target)** | https://talkforge.io |
| **Preview** | https://talkforge-virid.vercel.app — do **not** auto-promote |
| **Date** | 2026-07-27 |
| **Change Log** | v1 brochure; v2 clarity SaaS; **v3 Brand Directive — Forge experience redesign** |

---

## Executive Summary

**Founder feedback on v2:** Excellent craft (type, space, minimalism) — but it *explained* TalkForge instead of making people *feel* TalkForge. Beautiful brochure ≠ unforgettable identity experience.

**v3 response:** Complete redesign per Brand Directive v2. Emotion → Belief → Identity → Product. The homepage is the front door of a premier communication company — chapters into The Forge — not a feature-first SaaS template.

**Kept from v2:** Typography system (Fraunces/Manrope), aggressive whitespace, calm premium restraint, line *Advice is common. Practice is rare.* spirit (now embodied in Forge chapter), no visual clutter.

**Deploy:** Prepared for talkforge.io — **never deploy without Founder approval.**

---

## Experience architecture (chapters)

| Ch | Section | Job |
|---|---|---|
| 0 | Hero | Breathing mark · *Communication changes lives. Master yours.* · Forge Your Voice |
| 1 | Problem | Full-bleed cinematic photo · silence of the untaught |
| 2 | The Forge | Practice · Reflection · Growth · Confidence (motion, not cards) |
| 3 | Transformation | Product reveals as proof · conversation → confidence → opportunity → life |
| 4 | Community | Humanity photo + lights of practicers (no fake live counts) |
| 5 | Mission | Peak — voiceless belief · silence · whitespace |
| 6 | Access | Quiet founding invitation (pricing stays soft until identity lands) |
| 7 | Begin | Black finale · conversations trilogy · Begin the Forge |

---

## Key decisions (Atlas)

| Decision | Why |
|---|---|
| Emotion-first order | Founder directive; identity before features |
| No fabricated “4,281 practicing” | Honesty / AMD — lights + belonging copy until Internal Evidence |
| Quiet Access chapter, not hard prices | Users must want identity first; $ TBD by Founder |
| New mark (upward cutout silhouette) | Logo directive — timeless, favicon-safe, no AI clichés |
| Cinematic chapter photography | Storytelling; no smiling stock |
| Secondary CTA → `/welcome` | “Watch Someone Transform” until film exists |

---

## Design tests (self)

| Test | Counsel |
|---|---|
| Would Apple publish this? | Restraint + typography — directionally yes; refine forever |
| Would Nike tell this story? | Identity arc present; transformation chapter carries emotion |
| Would Patagonia believe this? | Mission peak protected |
| Premium in ten years? | Avoided trendy AI chrome; abstract mark |

---

## Risks & v2 improvements

| Risk | Mitigation |
|---|---|
| Long scroll | Chapters earn their length; Founder share-test |
| Product late | Intentional — do not reverse hierarchy |
| No real live stats yet | Belonging visual without lying |
| Pricing undefined | Soft founding access until Founder sets numbers |

---

## Deploy (Founder only)

1. `supabase/waitlist.sql` if needed  
2. Explicit Founder approval  
3. `npx vercel deploy --prod --yes`  
4. Attach talkforge.io  

| Field | Value |
|---|---|
| **Status Upon Signature** | v3 built — waiting Founder deploy approval |
