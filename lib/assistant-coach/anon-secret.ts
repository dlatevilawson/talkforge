/**
 * Phase 4B.3 — opaque anon secret + one-way hash (never store raw secret).
 */
import { createHash, randomBytes } from "node:crypto";

const SECRET_BYTES = 32;

/** Accept client mint / Idempotency-Key material (base64url-ish, high entropy). */
export const ANON_MINT_KEY_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

export class AnonMintKeyError extends Error {
  readonly code = "AC_ANON_MINT_KEY";

  constructor(message: string) {
    super(message);
    this.name = "AnonMintKeyError";
  }
}

/** Cryptographically secure opaque anon secret (base64url, 256-bit). */
export function generateAnonSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

/** One-way hash for assistant_coach_sessions.anon_key_hash. */
export function hashAnonSecret(rawSecret: string): string {
  return createHash("sha256").update(rawSecret, "utf8").digest("hex");
}

/**
 * Validate client-provided mint key used as the raw anon secret.
 * 43 chars ≈ 32 bytes base64url — matches generateAnonSecret() entropy floor.
 */
export function assertAnonMintKey(raw: string): string {
  const key = raw.trim();
  if (!ANON_MINT_KEY_PATTERN.test(key)) {
    throw new AnonMintKeyError(
      "Idempotency-Key must be 43–128 URL-safe base64 characters (256-bit+ entropy)."
    );
  }
  return key;
}
