/**
 * Phase 4B.3 — anonymous session mint / restore (server-only).
 *
 * VISITOR → verify cookie → hash secret → load active/gated unclaimed session
 *         → else mint with Idempotency-Key (required when cookieless)
 *
 * Concurrency: cookieless mints MUST share the same Idempotency-Key so
 * anon_key_hash collisions collapse to one active session via the unique index.
 *
 * No turn API, LLM, UI, or claim logic.
 */
import {
  AnonMintKeyError,
  assertAnonMintKey,
  generateAnonSecret,
  hashAnonSecret,
} from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  buildAnonCookieAttributes,
  parseAnonCookieValue,
  readCookieFromHeader,
  sealAnonCookieValue,
  type AnonCookieAttributes,
} from "./anon-cookie.ts";
import {
  isAnonSessionExpired,
  isAssistantCoachUniqueConflictError,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";

export type AnonSessionOutcome = "restored" | "minted" | "replaced";

export type PublicAnonSessionView = {
  id: string;
  status: AssistantCoachSession["status"];
  expiresAt: string;
  turnCount: number;
  hasExperiencedValue: boolean;
  outcome: AnonSessionOutcome;
};

export type EnsureAnonSessionResult = {
  session: AssistantCoachSession;
  rawSecret: string;
  sealedCookie: string;
  cookieAttributes: AnonCookieAttributes;
  outcome: AnonSessionOutcome;
  publicSession: PublicAnonSessionView;
};

export type EnsureAnonSessionOptions = {
  repository: AssistantCoachSessionRepository;
  cookieSecret: string;
  cookieHeader?: string | null;
  /**
   * Client-generated mint key (Idempotency-Key). Required when the cookie is
   * missing/invalid so concurrent first hits share one anon_key_hash.
   */
  mintKey?: string | null;
  now?: Date;
  /** Override secure flag (tests). */
  secureCookie?: boolean;
  /**
   * When true (default), cookieless mint requires mintKey.
   * Tests may set false only for isolated server-generated-secret cases.
   */
  requireMintKeyForMint?: boolean;
};

export { AnonMintKeyError };

function toPublic(
  session: AssistantCoachSession,
  outcome: AnonSessionOutcome
): PublicAnonSessionView {
  return {
    id: session.id,
    status: session.status,
    expiresAt: session.expiresAt,
    turnCount: session.turnCount,
    hasExperiencedValue: session.hasExperiencedValue,
    outcome,
  };
}

function isRestorableAnonSession(
  session: AssistantCoachSession,
  now: Date
): boolean {
  if (session.userId != null) return false;
  if (session.status !== "active" && session.status !== "gated") return false;
  if (isAnonSessionExpired(session, now)) return false;
  return true;
}

/**
 * Session + profile draft are created as a pair. Never adopt/restore a row
 * that is missing its draft (partial write or in-flight concurrent insert).
 */
async function isCompleteRestorableAnonSession(
  repository: AssistantCoachSessionRepository,
  session: AssistantCoachSession,
  now: Date
): Promise<boolean> {
  if (!isRestorableAnonSession(session, now)) return false;
  const draft = await repository.getDraft(session.id);
  return draft != null;
}

function resolveMintRawSecret(
  mintKey: string | null | undefined,
  requireMintKey: boolean
): string {
  const trimmed = mintKey?.trim() ?? "";
  if (trimmed) {
    return assertAnonMintKey(trimmed);
  }
  if (requireMintKey) {
    throw new AnonMintKeyError(
      "Idempotency-Key is required to mint an anonymous Assistant Coach session."
    );
  }
  return generateAnonSecret();
}

async function mintNewSession(
  repository: AssistantCoachSessionRepository,
  cookieSecret: string,
  now: Date,
  outcome: AnonSessionOutcome,
  options: {
    secureCookie?: boolean;
    mintKey?: string | null;
    requireMintKeyForMint?: boolean;
  }
): Promise<EnsureAnonSessionResult> {
  const requireMintKey = options.requireMintKeyForMint !== false;
  const rawSecret = resolveMintRawSecret(options.mintKey, requireMintKey);
  const anonKeyHash = hashAnonSecret(rawSecret);

  // Fast path: another concurrent request already created this hash.
  const preexisting = await repository.getSessionByAnonKeyHash(anonKeyHash);
  if (
    preexisting &&
    (await isCompleteRestorableAnonSession(repository, preexisting, now))
  ) {
    const sealedCookie = sealAnonCookieValue(rawSecret, cookieSecret);
    const cookieAttributes = buildAnonCookieAttributes(preexisting.expiresAt, {
      now,
      secure: options.secureCookie,
    });
    return {
      session: preexisting,
      rawSecret,
      sealedCookie,
      cookieAttributes,
      outcome: "restored",
      publicSession: toPublic(preexisting, "restored"),
    };
  }

  try {
    const session = await repository.createSession({
      anonKeyHash,
      now,
    });
    if (session.anonKeyHash === rawSecret) {
      throw new Error("raw anon secret must not be stored on the session.");
    }
    const sealedCookie = sealAnonCookieValue(rawSecret, cookieSecret);
    const cookieAttributes = buildAnonCookieAttributes(session.expiresAt, {
      now,
      secure: options.secureCookie,
    });
    return {
      session,
      rawSecret,
      sealedCookie,
      cookieAttributes,
      outcome,
      publicSession: toPublic(session, outcome),
    };
  } catch (err) {
    // Adopt only the expected unique-key concurrency collision — never
    // unrelated persistence failures (e.g. draft insert after session insert).
    if (!isAssistantCoachUniqueConflictError(err)) {
      throw err instanceof Error
        ? err
        : new Error("failed to mint anonymous Assistant Coach session");
    }
    const existing = await repository.getSessionByAnonKeyHash(anonKeyHash);
    if (
      existing &&
      (await isCompleteRestorableAnonSession(repository, existing, now))
    ) {
      const sealedCookie = sealAnonCookieValue(rawSecret, cookieSecret);
      const cookieAttributes = buildAnonCookieAttributes(existing.expiresAt, {
        now,
        secure: options.secureCookie,
      });
      return {
        session: existing,
        rawSecret,
        sealedCookie,
        cookieAttributes,
        outcome: "restored",
        publicSession: toPublic(existing, "restored"),
      };
    }
    // Unique conflict but winner is incomplete (no draft yet / draft failed)
    // or no longer restorable — do not mint success.
    if (existing) {
      throw new Error(
        "anonymous Assistant Coach session unique conflict without a complete profile draft"
      );
    }
    throw err;
  }
}

/**
 * Resolve the caller's anonymous AC session from the signed cookie, or mint.
 * Invalid/expired/claimed/unknown cookies mint a fresh session (no auth redirect)
 * when a valid Idempotency-Key is supplied.
 */
export async function ensureAnonAssistantCoachSession(
  options: EnsureAnonSessionOptions
): Promise<EnsureAnonSessionResult> {
  const now = options.now ?? new Date();
  const { repository, cookieSecret } = options;
  const mintOpts = {
    secureCookie: options.secureCookie,
    mintKey: options.mintKey,
    requireMintKeyForMint: options.requireMintKeyForMint,
  };
  const rawCookie = readCookieFromHeader(
    options.cookieHeader,
    ASSISTANT_COACH_ANON_COOKIE_NAME
  );
  const parsed = parseAnonCookieValue(rawCookie, cookieSecret);

  if (parsed.ok) {
    const anonKeyHash = hashAnonSecret(parsed.rawSecret);
    const existing = await repository.getSessionByAnonKeyHash(anonKeyHash);
    if (existing) {
      if (isAnonSessionExpired(existing, now)) {
        await repository.markExpiredIfPast(existing.id, now);
        return mintNewSession(
          repository,
          cookieSecret,
          now,
          "replaced",
          mintOpts
        );
      }
      if (await isCompleteRestorableAnonSession(repository, existing, now)) {
        const sealedCookie = sealAnonCookieValue(
          parsed.rawSecret,
          cookieSecret
        );
        const cookieAttributes = buildAnonCookieAttributes(existing.expiresAt, {
          now,
          secure: options.secureCookie,
        });
        return {
          session: existing,
          rawSecret: parsed.rawSecret,
          sealedCookie,
          cookieAttributes,
          outcome: "restored",
          publicSession: toPublic(existing, "restored"),
        };
      }
      // Claimed / handed_off / incomplete draft / unexpected — do not restore.
      return mintNewSession(
        repository,
        cookieSecret,
        now,
        "replaced",
        mintOpts
      );
    }
    // Unknown hash (DB miss) — mint fresh.
    return mintNewSession(
      repository,
      cookieSecret,
      now,
      "replaced",
      mintOpts
    );
  }

  return mintNewSession(repository, cookieSecret, now, "minted", mintOpts);
}
