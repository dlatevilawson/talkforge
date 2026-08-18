/**
 * Phase 4B.3 — Assistant Coach anonymous cookie / signing configuration.
 * Server-only. Never expose via NEXT_PUBLIC_*.
 */

export const ASSISTANT_COACH_ANON_COOKIE_NAME = "tf_ac_anon";
export const ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV =
  "ASSISTANT_COACH_ANON_COOKIE_SECRET";

/** Minimum HMAC key length (bytes as string length). */
export const ASSISTANT_COACH_ANON_COOKIE_SECRET_MIN_LENGTH = 32;

export class AssistantCoachConfigError extends Error {
  readonly code = "AC_ANON_COOKIE_CONFIG";

  constructor(message: string) {
    super(message);
    this.name = "AssistantCoachConfigError";
  }
}

export function isProductionRuntime(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.VERCEL_ENV === "preview"
  );
}

/**
 * Fail closed when the signing secret is missing or too short.
 * Preview/production always require a strong secret; local/test must still
 * supply one when minting (tests inject via options / env).
 */
export function requireAssistantCoachAnonCookieSecret(
  env: NodeJS.ProcessEnv = process.env
): string {
  const secret = env[ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV]?.trim() ?? "";
  if (!secret) {
    throw new AssistantCoachConfigError(
      `${ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV} is required for Assistant Coach anonymous sessions.`
    );
  }
  if (secret.length < ASSISTANT_COACH_ANON_COOKIE_SECRET_MIN_LENGTH) {
    throw new AssistantCoachConfigError(
      `${ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV} must be at least ${ASSISTANT_COACH_ANON_COOKIE_SECRET_MIN_LENGTH} characters.`
    );
  }
  return secret;
}
