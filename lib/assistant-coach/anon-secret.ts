/**
 * Phase 4B.3 — opaque anon secret + one-way hash (never store raw secret).
 */
import { createHash, randomBytes } from "node:crypto";

const SECRET_BYTES = 32;

/** Cryptographically secure opaque anon secret (base64url). */
export function generateAnonSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

/** One-way hash for assistant_coach_sessions.anon_key_hash. */
export function hashAnonSecret(rawSecret: string): string {
  return createHash("sha256").update(rawSecret, "utf8").digest("hex");
}
