# TalkForge Hero Film V1 — Production Bible

**Document ID:** FILM-001  
**Version:** 1.0.0  
**Status:** Production  
**Authority:** Founder creative assignment  
**Platform (this run):** OpenAI Sora 2 / Sora 2 Pro (Google Flow Veo 3 and Runway Gen-4 not authenticated in this environment; Sora used as available cinematic generator)  
**Output:** `/public/video/hero.mp4` · 16:9 · H.264 · web-optimized · muted-autoplay ready

---

## Objective

Official cinematic hero film for the TalkForge landing page.

Not a product demo. Not an AI commercial.  
A premium brand film about **human transformation**.

Audience leaves with **hope** — because they saw themselves.

---

## Theme

Every life is shaped by conversations.  
Some people already know what they want to say.  
They simply need a place to practice.  
TalkForge exists to help people find their voice.

---

## Emotional arc

Missed moments → private struggle → discovery → practice → earned confidence → shared hope.

Closing title: **Find Your Voice. · TalkForge**

---

## Cinematography lock

- Cinematic realism · natural light · warm blacks · soft gold highlights  
- Slow deliberate camera · shallow DOF · close-ups on emotion  
- Human-first · minimal UI · no futuristic effects · no exaggerated acting  
- Mood references only (not imitation): premium Apple/Nike brand film pacing; Villeneuve restraint; Deakins natural light; Lubezki immersive movement  

---

## Music

Quiet piano → subtle strings → emotional build with silence pockets.  
Landing page plays **muted**; master may carry score.

---

## Shot structure (≈35–45s)

| # | Beat | Duration target | Notes |
|---|------|-----------------|-------|
| 1 | Missed opportunity — meeting | ~6–8s | Woman hesitates; coworker takes the idea |
| 2 | Love — dinner | ~5–6s | Young man stops himself |
| 3 | Belonging — campus | ~5–6s | Young woman loses courage |
| 4 | Turning point — night discovery | ~5–6s | Three homes, calm product presence |
| 5 | Practice montage | ~5–6s | Emotion over UI; split-screen feel in edit |
| 6 | Resolution — three wins | ~8–10s | Presentation · family embrace · new friend |
| 7 | Final hope + title | ~4–5s | Face of hope · fade · Find Your Voice |

---

## Deliverables checklist

- [x] Scene clips generated (Sora 2 · 7 beats)
- [x] Assembled / color graded / title card
- [x] `/public/video/hero.mp4` (~40s · 1280×720 · H.264 · ~3MB web)
- [x] `/public/video/hero-master.mp4` (higher-bitrate archive)
- [x] `/public/video/hero-poster.jpg`
- [x] Landing hero: autoplay · loop · muted · seamless background (`HeroVideo`)
- [x] Nav adapts over film (light) → scrolled (light page)

## Production notes (this run)

| Item | Detail |
|------|--------|
| Requested primary | Google Flow (Veo 3) — not authenticated here |
| Requested fallback | Runway Gen-4 — not authenticated here |
| Used | **OpenAI Sora 2** (available via `OPENAI_API_KEY`) |
| Runtime | ~39.6 seconds |
| Aspect | 16:9 (1280×720) |
| Audio | Silent master for muted autoplay compliance; score can be added in V2 |
| Moderation | Night-discovery prompt rewritten once after block |

---

## Integrity note

Google Flow (Veo 3) was the requested primary; Runway Gen-4 the fallback. Neither had credentials in this cloud agent environment. **Sora 2** was used to fulfill cinematic generation. Prompts avoid copyrighted frame imitation and avoid depicting minors. Teen belonging beat portrayed as young adult on university campus for policy safety.
