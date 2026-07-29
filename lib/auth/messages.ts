/**
 * Human-readable auth messages. Never expose internal/provider details to users.
 */

export function mapAuthError(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const lower = raw.toLowerCase();

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("email not confirmed")
  ) {
    if (lower.includes("email not confirmed")) {
      return "Please verify your email before signing in.";
    }
    return "Incorrect email or password.";
  }

  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in.";
  }

  if (lower.includes("password")) {
    if (lower.includes("weak") || lower.includes("least")) {
      return "Choose a stronger password that meets the requirements.";
    }
  }

  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach the authentication service. Please try again.";
  }

  if (lower.includes("not configured") || lower.includes("missing")) {
    return "Authentication is temporarily unavailable.";
  }

  return fallback;
}

export const AUTH_COPY = {
  signupSuccess:
    "Check your email to verify your account. We’ll open onboarding after you confirm.",
  verifyPending: "Verify your email to continue.",
  resetSent: "If an account exists for that email, we sent a reset link.",
  resetSuccess: "Your password was updated. You can sign in now.",
  logoutSuccess: "You have been signed out.",
  mustChangePassword: "For security, please choose a new password before continuing.",
} as const;
