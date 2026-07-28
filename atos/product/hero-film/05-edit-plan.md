# 05 — Edit Plan

**Document ID:** FILM-EP-001  
**Depends on:** [01](01-creative-brief.md) · [02](02-story-bible.md) · [03](03-shot-list.md) · [04](04-prompt-bible.md)  
**Status:** Binding assembly guide  
**Version:** 1.0.0  
**Output:** `/public/video/hero.mp4` (+ master archive)

---

## Purpose

Answer: **How do we assemble the film so emotion lands?**

Generation creates coverage.  
Edit creates meaning.

---

## Picture lock order

Assemble strictly in Shot List order **S01 → S20**.

Do not rearrange acts for “energy.”  
The freeze must come before practice.  
Practice must come before return.  
Hope must come last.

---

## Target timeline (45s max)

| Timecode | Shots | Act |
|----------|-------|-----|
| 0:00–0:16 | S01–S08 | Three freezes |
| 0:16–0:22 | S09–S11 | Night discovery |
| 0:22–0:28 | S12–S14 | Practice |
| 0:28–0:38 | S15–S17 | Return to life |
| 0:38–0:45 | S18–S20 | Hope + title |

Trim ruthlessly to keep ≤45s. Prefer cutting frames from Act I and practice cells before cutting resolution.

---

## Cutting principles

1. **Cut on emotion, not action.** Leave a frame after the feeling lands.  
2. **Silence is a cut.** Use hold frames before Act II and before S19.  
3. **No flashy transitions.** Straight cuts; dissolves only for S09–S11 if needed (≤8 frames).  
4. **Match intentional.** Eyes → eyes across Maya/Jordan/Ava when possible.  
5. **Product never wins a cut.** If UI is clearer than a face, reframe or darken UI.  
6. **Loop-aware ending.** For web loop: title should resolve cleanly into black before restart, or hard-cut from black to S01.

---

## Split-screen (practice act)

**Intent:** Show three private practices as one movement of becoming.

| Option | When to use |
|--------|-------------|
| **A — True split** | S12\|S13\|S14 simultaneous, equal thirds, shared music swell |
| **B — Rapid triad** | 1.7s each hard cut (safer if plates don’t match) |

Prefer **A** if framing and eyelines are compatible.  
Keep split ≤5–6s total. Return to full frame for S15.

---

## Music & sound

### Score arc

| Section | Music |
|---------|-------|
| S01–S04 | Sparse piano — almost nothing |
| S05–S08 | Piano continues, slight warmth |
| End of S08 | **Silence pocket** (0.4–0.8s) |
| S09–S11 | Quiet piano returns |
| S12–S14 | Subtle strings enter |
| S15–S17 | Emotional build — restrained, not trailer-loud |
| S18 | Resolve begins |
| S19 | Thin to near silence |
| S20 | Soft final chord or silence under title |

### Sound design

- No intelligible dialogue.  
- Optional soft room tone only if it doesn’t fight music.  
- No whooshes, risers, or “tech” stingers.

### Web mute

Landing page plays **muted**.  
Still mix a full master with score for brand/social.  
Export `hero.mp4` with audio optional; autoplay uses muted attribute regardless.

---

## Color grade

| Goal | Method |
|------|--------|
| Warm blacks | Lift shadows slightly warm; avoid crushed blue-black |
| Soft gold highlights | Gentle highlight warmth; no orange skin |
| Skin priority | Protect faces above “look” |
| Consistency | Match grade across all plates before creative looks |
| Finale | Slightly brighter hope on S15–S17; intimate on S19 |

**References for grade intent only:** Deakins naturalism — not a LUT named after a film.

---

## Title card (S20)

1. Fade to `#050505` over ~20–30 frames.  
2. Hold black 4–6 frames.  
3. Fade up **Find Your Voice.** — warm ivory/gold, centered, refined sans or display.  
4. Beat.  
5. **TalkForge** in brand gold (`#C99B4A` family).  
6. Optional: small official mark above or beside wordmark — never crowded.  
7. Hold 2–3s. Fade out.

Do not AI-generate titles inside video plates.

---

## Technical export

### Master

| Spec | Value |
|------|-------|
| Container | MP4 |
| Codec | H.264 (or ProRes mezzanine if available, then H.264) |
| Resolution | Highest available from plates (document if <4K) |
| Frame rate | Match plates (24fps preferred) |
| Audio | Stereo score mix |

Path suggestion: `/public/video/hero-master.mp4`

### Web

| Spec | Value |
|------|-------|
| Path | `/public/video/hero.mp4` |
| Resolution | 1280×720 or 1920×1080 if size allows |
| Codec | H.264, `+faststart` |
| CRF | ~22–26 (balance quality vs load) |
| Audio | Optional; page mutes |
| Poster | `/public/video/hero-poster.jpg` from S19 |

---

## Landing integration checklist

- [ ] `HeroVideo` uses `/video/hero.mp4`  
- [ ] `autoPlay` · `muted` · `loop` · `playsInline`  
- [ ] Poster set for LCP  
- [ ] Scrim keeps type readable  
- [ ] Nav readable over film  
- [ ] Works on mobile Safari muted autoplay  

---

## QC before ship

| Check | Pass? |
|-------|-------|
| Runtime 30–45s | |
| Muted, story still clear | |
| No tech-ad feel | |
| Faces > UI | |
| No minors | |
| Title correct: Find Your Voice. / TalkForge | |
| Loop doesn’t hard-jolt from title to Maya | |
| Grade consistent | |
| File size acceptable for web | |

---

## Relationship to V1

V1 (`hero.mp4` currently on branch) was assembled **before** this production system existed — prompts without a formal brief/bible/shot list.

**Policy:**  
- Keep V1 as draft on site until a system-compliant cut replaces it.  
- Any regenerate must start at Creative Brief acceptance and proceed 01→05.  
- Do not “prompt harder” to fix story problems — fix Story Bible / Shot List first.

---

## Assembly ownership

| Role | Owns |
|------|------|
| Creative Director | Emotion, cut approval, QC |
| Generator | Plates per Prompt Bible |
| Editor | Timeline per this Edit Plan |
| Founder | Final acceptance |

---

*System complete. Generate only after 01–03 are locked; assemble only per this plan.*
