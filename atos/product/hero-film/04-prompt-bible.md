# 04 — Prompt Bible

**Document ID:** FILM-PB-001  
**Depends on:** [01](01-creative-brief.md) · [02](02-story-bible.md) · [03](03-shot-list.md)  
**Status:** Used for Promo V1 generation (FILM-002) — recreate prompts with app-launch film  
**Version:** 1.0.0  
**Rule:** Do not invent shots here. Only express the Shot List.

---

## Global look block (prepend or paste into every prompt)

```text
Cinematic realism, premium brand film, photorealistic, natural window or practical lamp light,
warm blacks, soft golden highlights, shallow depth of field, slow deliberate camera movement,
understated performance, no exaggerated acting, no spoken dialogue, no on-screen text, no logos,
no holograms, no futuristic UI glow, no sci-fi effects, no neon, human-first storytelling, 16:9.
```

**Negative / avoid block (append when platform supports negatives)**

```text
Avoid: cartoon, anime, CGI look, stock-photo smile, melodrama, tears streaming, product UI as hero,
chat bubbles, microphones, sound waves, purple AI glow, text overlays, watermarks, shaky cam gimmicks,
minors, children, teenagers under 18.
```

---

## Character locks (keep wording consistent across shots)

**Maya:** East Asian woman in her late twenties, professional, dark shoulder-length hair, understated elegance, warm but reserved face.

**Jordan:** Black man in his late twenties, warm grounded presence, casual-smart dinner clothes.

**Ava:** Young woman about twenty (adult), open face, university-casual clothes, natural, not glamorous.

---

## Prompts by shot

### S01 — Maya: the breath before speech

```text
{GLOBAL LOOK}
Maya: East Asian woman late twenties, professional attire, dark shoulder-length hair.
Modern bright conference room, soft daylight through glass.
Medium close-up at eye level. She inhales, chin lifts slightly — about to speak.
Slow push-in, shallow depth of field, understated hope in her eyes.
No dialogue, no text.
```

### S02 — Maya: the hesitation  
*(Prefer continuous generation with S01 when platform allows; else match framing.)*

```text
{GLOBAL LOOK}
Same Maya in the same conference room, same wardrobe and hair.
Medium close-up continuing: eyes flicker with doubt, mouth closes, hands settle on the table.
Slow push-in holds. Quiet disappointment beginning — not melodrama.
No dialogue, no text.
```

### S03 — Maya: the room takes the idea

```text
{GLOBAL LOOK}
Same conference room. Over-the-shoulder or wider: a confident colleague speaks; several people nod.
Maya visible at frame edge or soft background — watching, still.
Slow subtle lateral move. Natural office daylight. Emotion: cost of silence.
No readable dialogue, no text.
```

### S04 — Maya: aftermath

```text
{GLOBAL LOOK}
Extreme close-up on Maya’s eyes and face. Soft background suggestion of congratulations elsewhere in the office —
out of focus. She receives the news quietly. Warm daylight, shallow depth of field, hold.
Emotion: quiet grief of the almost. No tears spectacle. No dialogue, no text.
```

---

### S05 — Jordan: the words ready

```text
{GLOBAL LOOK}
Jordan: Black man late twenties at a warm family dinner table at home, soft lamp light.
Medium close-up. He looks at his parents with soft resolve forming — about to share important news.
Slow camera settle, shallow depth of field, intimate and human.
No dialogue, no text.
```

### S06 — Jordan: stops himself

```text
{GLOBAL LOOK}
Same Jordan, same dinner, same wardrobe. He opens his mouth to speak, then stops, forces a small smile,
changes the subject with a small gesture. Disappointment visible in his eyes.
Slow push-in. Warm practical light. Understated acting. No dialogue, no text.
```

---

### S07 — Ava: the threshold

```text
{GLOBAL LOOK}
Ava: young woman about twenty (adult), university-casual clothes, open face.
Sunlit university campus walkway. She watches a group of friends laughing nearby.
Tracking shot with her, then soft POV toward the group. Emotion: longing for belonging.
No dialogue, no text. No minors in frame.
```

### S08 — Ava: courage fails

```text
{GLOBAL LOOK}
Same Ava on the same campus. She takes a step toward the group, loses courage, looks down,
and keeps walking alone. Subtle handheld feel, then she moves past camera.
Emotion: the walk of almost. Daylight, realistic, understated. No dialogue, no text.
```

---

### S09 — Night discovery: Maya

```text
{GLOBAL LOOK}
Late night. Quiet bedroom. Warm lamp. Maya sits on the edge of her bed looking thoughtfully at her phone —
searching for help with confidence and hard conversations, calm not dramatic.
Slow push-in on her face. Soft phone glow secondary. Hope beginning. No logos readable. No dialogue, no text.
```

### S10 — Night discovery: Jordan

```text
{GLOBAL LOOK}
Late night kitchen. Warm practical light. Jordan at the table with a laptop open to a calm, minimal,
simple practice-app interface (blurry/secondary). His face is the subject — soft hope.
Static medium close-up. Trustworthy, human, no futuristic UI. No dialogue, no text.
```

### S11 — Night discovery: Ava

```text
{GLOBAL LOOK}
Late night living room. Ava on a couch with headphones, quietly practicing speaking to herself —
a greeting, a breath, a retry. Soft lamp light. Gentle slow push or micro orbit.
Emotion: first agency. Adult young woman. No dialogue readable as sales. No text overlays.
```

---

### S12 — Practice: Maya

```text
{GLOBAL LOOK}
Morning-soft light arriving. Maya standing alone in a quiet room rehearsing a presentation —
speaking to empty air, pausing, trying again. Imperfect, human. Medium shot.
Emotion: work, not magic. Minimal or no UI. No dialogue clarity required. No text.
```

### S13 — Practice: Jordan

```text
{GLOBAL LOOK}
Jordan alone at home practicing a difficult personal sentence — breath, restart, clearer posture.
Medium close-up, warm morning light. Emotion: private courage building.
Understated. No dialogue as readable captions. No text.
```

### S14 — Practice: Ava

```text
{GLOBAL LOOK}
Ava alone practicing introducing herself — almost-smile arriving. Soft morning light.
Medium close-up. Emotion: readiness approaching. Adult young woman. No text, no logos.
```

---

### S15 — Resolution: Maya presents

```text
{GLOBAL LOOK}
Conference room again. Maya confidently but calmly presents an idea. Colleagues listen attentively.
Slow push-in on Maya’s face — earned relief, not swagger. Soft golden daylight.
Emotion: “I think I can.” No dialogue, no text, no victory posing.
```

### S16 — Resolution: Jordan tells his family

```text
{GLOBAL LOOK}
Family dinner. Jordan speaks; his parents’ faces soften into smiles; they embrace him.
Warm lamp and soft golden tones. Medium shot into closer embrace.
Emotion: love unblocked. Understated joy. No dialogue, no text.
```

### S17 — Resolution: Ava belongs

```text
{GLOBAL LOOK}
University campus daylight. Ava approaches another student, introduces herself; the other student smiles;
they walk away together. Tracking shot, shallow depth of field, warm light.
Emotion: belonging begins. Adults only. No dialogue, no text.
```

---

### S18 — Recommendation

```text
{GLOBAL LOOK}
Quiet everyday setting. One of Maya, Jordan, or Ava notices someone struggling subtly.
A small human gesture of help — showing a phone briefly or speaking a few unheard words — calm, not salesy.
Observational medium shot. Emotion: generosity. No logos readable. No text.
```

### S19 — Fourth face: hope

```text
{GLOBAL LOOK}
Intimate close-up of a new adult who has just discovered hope — soft eyes, quiet relief, almost a smile.
Hold the shot. Natural window light, warm blacks, extremely shallow depth of field.
Emotion: hope received. No dialogue, no text. Then gentle darkening toward black if platform allows.
```

### S20 — Title card

**Do not AI-generate.** Compose in edit per Edit Plan:

- Fade to `#050505`  
- Type: **Find Your Voice.** (warm ivory / gold)  
- Then: **TalkForge** (brand gold)  
- Optional: official mark lockup sparingly  

---

## Generation pairing guide

| Generate as | Shots | Why |
|-------------|-------|-----|
| One continuous clip | S01→S02 | Hesitation must feel like one breath |
| Separate | S03, S04 | Coverage angles |
| Separate | S05, S06 | Same for Jordan |
| Separate | S07, S08 | Same for Ava |
| Separate | S09, S10, S11 | Control night continuity |
| Separate | S12, S13, S14 | Split-screen later |
| Separate | S15, S16, S17 | Resolution clarity |
| Separate | S18, S19 | Finale control |
| Edit only | S20 | Brand-safe titles |

---

## Platform notes

| Platform | Preference |
|----------|------------|
| Google Flow / Veo 3 | Primary when authenticated |
| Runway Gen-4 | Fallback |
| Sora 2 / Pro | Available alternate — document model & size |

Always record: model · size · seconds · seed/id · date · shot ID.

---

*Next → [05-edit-plan.md](05-edit-plan.md)*
