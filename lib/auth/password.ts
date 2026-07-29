/**
 * Password policy for TalkForge.
 * Enforced: minimum 8 characters.
 * Recommended (shown, not required): uppercase, lowercase, number, special character.
 */

export const PASSWORD_MIN_LENGTH = 8;

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
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL.test(password);

  const errors: string[] = [];
  if (!hasMinLength) {
    errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const tipsMet = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean)
    .length;
  let score: PasswordCheck["score"] = 0;
  if (hasMinLength) score = 1;
  if (hasMinLength && tipsMet >= 1) score = 2;
  if (hasMinLength && tipsMet >= 2) score = 3;
  if (hasMinLength && tipsMet >= 3) score = 4;

  return {
    valid: hasMinLength,
    errors,
    score,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}

/** Enforced server-side: length only. Strength tips are optional. */
export function assertPasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function passwordStrengthLabel(score: PasswordCheck["score"]): string {
  switch (score) {
    case 0:
      return "Too short";
    case 1:
      return "Okay";
    case 2:
      return "Fair";
    case 3:
      return "Strong";
    case 4:
      return "Excellent";
  }
}
