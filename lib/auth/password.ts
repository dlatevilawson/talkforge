/**
 * Password policy for TalkForge.
 * Minimum: 12 chars, uppercase, lowercase, number.
 * Recommended: special character.
 */

export type PasswordCheck = {
  valid: boolean;
  errors: string[];
  score: 0 | 1 | 2 | 3 | 4;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

const SPECIAL = /[^A-Za-z0-9]/;

export function evaluatePassword(password: string): PasswordCheck {
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push("Use at least 12 characters.");
  if (!hasUpper) errors.push("Include an uppercase letter.");
  if (!hasLower) errors.push("Include a lowercase letter.");
  if (!hasNumber) errors.push("Include a number.");

  const requiredOk = hasMinLength && hasUpper && hasLower && hasNumber;
  let score: PasswordCheck["score"] = 0;
  if (hasMinLength) score = 1;
  if (requiredOk) score = hasSpecial ? 4 : 3;
  else if ([hasUpper, hasLower, hasNumber].filter(Boolean).length >= 2) score = 2;

  return {
    valid: requiredOk,
    errors,
    score,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}

export function assertPasswordPolicy(password: string): string | null {
  const result = evaluatePassword(password);
  if (result.valid) return null;
  return result.errors[0] ?? "Password does not meet requirements.";
}

export function passwordStrengthLabel(score: PasswordCheck["score"]): string {
  switch (score) {
    case 0:
      return "Too weak";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Strong";
    case 4:
      return "Excellent";
  }
}
