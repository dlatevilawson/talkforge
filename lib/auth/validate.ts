import { assertPasswordPolicy } from "@/lib/auth/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeText(input: string, max = 80): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function validateEmail(email: string): string | null {
  const value = sanitizeText(email, 254).toLowerCase();
  if (!value) return "Enter your email address.";
  if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
  return null;
}

export type SignupInput = {
  email: string;
  password: string;
  displayName: string;
};

export type SignupFieldErrors = {
  email?: string;
  password?: string;
  displayName?: string;
};

/** TIP Phase 5 — account creation only. Profile polish happens in onboarding. */
export function validateSignup(input: SignupInput): {
  ok: boolean;
  errors: SignupFieldErrors;
  data?: SignupInput;
} {
  const email = sanitizeText(input.email, 254).toLowerCase();
  const password = input.password;
  const displayName = sanitizeText(input.displayName, 64);

  const errors: SignupFieldErrors = {};
  const emailErr = validateEmail(email);
  const passwordErr = assertPasswordPolicy(password);

  if (emailErr) errors.email = emailErr;
  if (passwordErr) errors.password = passwordErr;

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    data: { email, password, displayName },
  };
}
