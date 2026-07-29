# FILM-002 — Promo V1 Production Log

| Field | Value |
|---|---|
| **Document ID** | FILM-002 |
| **Version** | 1.0.0 |
| **Status** | **Shipped for LP** — Promo V1 (not app-launch film) |
| **Date** | 2026-07-28 |
| **Authority** | Decision 036 |

---

## Lock

Founder locked **00–03** for the first promo video. App-launch film will be a later recreation.

Generation followed hierarchy:

0. Philosophy → 1. Brief → 2. Story Bible → 3. Shot List → **4. Prompt Bible → 5. Edit Plan**

---

## What shipped

| Asset | Path | Spec |
|-------|------|------|
| Web film | `/public/video/hero.mp4` | ~44.8s · 1280×720 · H.264 · ~5.6MB |
| Master | `/public/video/hero-master.mp4` | Same picture, higher bitrate |
| Poster | `/public/video/hero-poster.jpg` | From hope plate |

| Field | Value |
|-------|------|
| Platform | OpenAI Sora 2 |
| Script | `scripts/generate_promo_v1.py` |
| Plates | P01–P08 (S01–S19 compressed; S20 title in edit) |
| Assembly | ~5s trim per plate + 3s title card · grade · fade |

---

## QC notes (Promo V1)

- Emotion/arc present: freeze → night/practice → resolution → hope → title.
- Cinematic look holds: soft light, shallow DOF, warm blacks.
- **Character identity drifts across plates** (Sora continuity limit). Acceptable for Promo V1; lock likeness harder for app-launch recreate.
- No moderation blocks on this run.
- Treat as **promo**, not final brand film.

---

## Next

Recreate before official app launch using the same hierarchy (00–05). Do not skip to prompts.
