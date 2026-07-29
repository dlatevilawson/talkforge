# Auth email templates (TalkForge)

Apply via **Supabase Dashboard → Authentication → Email Templates**, or:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... npm run auth:configure
```

| Template | Subject | File |
|----------|---------|------|
| Confirm signup | Welcome to TalkForge — Verify Your Email | `verification.html` |
| Reset password | Reset Your TalkForge Password | `password-reset.html` |
| Invite | You’re invited to TalkForge | `invitation.html` |
| Email change | Confirm your TalkForge email change | `email-change.html` |
| Welcome (post-verify copy) | Welcome to TalkForge | `welcome.html` |

Templates use `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, and `{{ .Token }}` (OTP).

**Required with templates:** Auth URL Configuration Site URL = `https://talkforge.io` and redirect allowlist `https://talkforge.io/**`.

Until Site URL is production, users can verify via OTP / paste-link on `/verify-email`.
