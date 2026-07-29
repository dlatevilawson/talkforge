# Auth email templates (TalkForge)

Paste into **Supabase Dashboard → Authentication → Email Templates**, or run:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... npm run auth:configure
```

| Template | Subject | File |
|----------|---------|------|
| Confirm signup | Welcome to TalkForge — Verify Your Email | `verification.html` |
| Reset password | Reset Your TalkForge Password | `password-reset.html` |
| Invite / welcome | Welcome to TalkForge | `welcome.html` |

Links in these templates point at **https://talkforge.io/auth/callback** with `token_hash` so confirmation works on phones (never localhost).

Also set **URL Configuration**:

- Site URL: `https://talkforge.io`
- Redirect URLs: `https://talkforge.io/**`, `http://localhost:3000/**`
