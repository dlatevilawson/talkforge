# LP-001 — TalkForge Production Landing Page v1.0

| Field | Value |
|---|---|
| **Document ID** | LP-001 |
| **Version** | 1.0.0 |
| **Status** | Built — **awaiting Founder deploy approval** |
| **Authority** | Atlas Execution Order |
| **Domain** | https://talkforge.io |
| **Preview (current prod alias)** | https://talkforge-virid.vercel.app (do **not** auto-promote without Founder approval) |
| **Dependencies** | PCI-001, BETA-REC-002, RES-016 |
| **Date** | 2026-07-22 |

---

## What shipped in code

- Production marketing homepage at `/` (official public face)
- App onboarding moved to `/welcome` (“See TalkForge in Action”)
- Sections: Nav · Hero · Belief · Experience · Mission journey · Founding Members · Waitlist · FAQ · Footer
- Official logo mark: `public/brand/talkforge-mark.svg` + `TalkForgeLogo` component
- Real waitlist API: `POST /api/waitlist` → Supabase `waitlist_members`
- SEO metadata + `app/opengraph-image.tsx`
- Privacy `/privacy` · Terms `/terms`
- Subtle scroll reveal (respects `prefers-reduced-motion`)

## Craftsmanship Review (PCI-001)

| Criterion | Assessment |
|---|---|
| Emotional first impression | Strong — brand + belief-forward hero |
| Clarity of purpose | Strong — Communication Gym, practice not advice |
| Hospitality / warmth | Strong — founding invitation, calm copy |
| Visual organization | Strong — one question per section, whitespace |
| Sense of calm / premium | Intentional light editorial system |
| Shareability | Designed to pass share test; Founder validates on device |
| Mission protection | Belief + gym framing preserved |

**Share test counsel:** Directionally yes for a calm founding waitlist page. Founder should spend five minutes on mobile before deploy approval.

---

## Required before go-live

1. **Run waitlist SQL** in Supabase SQL editor: [`supabase/waitlist.sql`](../../supabase/waitlist.sql)  
2. **Founder approval to deploy** (this order forbids auto-deploy)  
3. Attach custom domain **talkforge.io** in Vercel  
4. Confirm DNS + HTTPS  
5. Smoke: join waitlist with a real email; verify row in `waitlist_members`

---

## Deployment instructions (Founder-approved only)

Do **not** run these until the Founder explicitly approves deployment.

### A. Apply database

In Supabase → SQL → run `supabase/waitlist.sql`.

### B. Production deploy (existing Founder Vercel project)

From repo root (authenticated Vercel CLI / Founder machine):

```bash
npx vercel deploy --prod --yes
```

Project: `dlatevilawson-7440s-projects/talkforge`  
Current alias: `talkforge-virid.vercel.app`

### C. Attach talkforge.io

1. Vercel → Project → Settings → Domains  
2. Add `talkforge.io` and `www.talkforge.io`  
3. Configure DNS as Vercel instructs (A/CNAME)  
4. Wait for SSL  
5. Verify:
   - `https://talkforge.io/` → landing  
   - `https://talkforge.io/welcome` → product welcome  
   - `POST https://talkforge.io/api/waitlist` with a test email  

### D. Post-deploy checklist

- [ ] Hero logo + headline render on iPhone Safari  
- [ ] Nav anchors scroll correctly  
- [ ] Waitlist success state appears  
- [ ] Email appears once in Supabase  
- [ ] OG preview looks correct when shared  
- [ ] Privacy / Terms reachable from footer  

---

## Local verification (completed by Atlas)

```bash
npm run typecheck
npm run build
```

| Field | Value |
|---|---|
| **Status Upon Signature** | Built — waiting Founder deploy approval |
