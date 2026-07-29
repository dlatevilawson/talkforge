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

export function validateName(name: string, label: string): string | null {
  const value = sanitizeText(name, 64);
  if (!value) return `Enter your ${label}.`;
  if (value.length < 1) return `${label} is required.`;
  return null;
}

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SignupFieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

export function validateSignup(input: SignupInput): {
  ok: boolean;
  errors: SignupFieldErrors;
  data?: SignupInput;
} {
  const firstName = sanitizeText(input.firstName);
  const lastName = sanitizeText(input.lastName);
  const email = sanitizeText(input.email, 254).toLowerCase();
  const password = input.password;

  const errors: SignupFieldErrors = {};
  const firstErr = validateName(firstName, "first name");
  const lastErr = validateName(lastName, "last name");
  const emailErr = validateEmail(email);
  const passwordErr = assertPasswordPolicy(password);

  if (firstErr) errors.firstName = firstErr;
  if (lastErr) errors.lastName = lastErr;
  if (emailErr) errors.email = emailErr;
  if (passwordErr) errors.password = passwordErr;

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    data: { firstName, lastName, email, password },
  };
}
