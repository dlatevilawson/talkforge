/**
 * Phase 4B.3 — anonymous session mint / restore (server-only).
 *
 * VISITOR → verify cookie → hash secret → load active/gated unclaimed session
 *         → else mint new row + sealed cookie secret
 *
 * No turn API, LLM, UI, or claim logic.
 */
import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
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
  now?: Date;
  /** Override secure flag (tests). */
  secureCookie?: boolean;
};

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

async function mintNewSession(
  repository: AssistantCoachSessionRepository,
  cookieSecret: string,
  now: Date,
  outcome: AnonSessionOutcome,
  secureCookie?: boolean
): Promise<EnsureAnonSessionResult> {
  // Retry on rare anon_key_hash collision / unique race.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const rawSecret = generateAnonSecret();
    const anonKeyHash = hashAnonSecret(rawSecret);
    try {
      const session = await repository.createSession({
        anonKeyHash,
        now,
      });
      // Never persist raw secret on the session record.
      if (session.anonKeyHash === rawSecret) {
        throw new Error("raw anon secret must not be stored on the session.");
      }
      const sealedCookie = sealAnonCookieValue(rawSecret, cookieSecret);
      const cookieAttributes = buildAnonCookieAttributes(session.expiresAt, {
        now,
        secure: secureCookie,
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
      lastError = err;
      // Concurrent insert with same hash: adopt the winner if restorable.
      const existing = await repository.getSessionByAnonKeyHash(anonKeyHash);
      if (existing && isRestorableAnonSession(existing, now)) {
        const sealedCookie = sealAnonCookieValue(rawSecret, cookieSecret);
        const cookieAttributes = buildAnonCookieAttributes(existing.expiresAt, {
          now,
          secure: secureCookie,
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
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("failed to mint anonymous Assistant Coach session");
}

/**
 * Resolve the caller's anonymous AC session from the signed cookie, or mint.
 * Invalid/expired/claimed/unknown cookies mint a fresh session (no auth redirect).
 */
export async function ensureAnonAssistantCoachSession(
  options: EnsureAnonSessionOptions
): Promise<EnsureAnonSessionResult> {
  const now = options.now ?? new Date();
  const { repository, cookieSecret } = options;
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
          options.secureCookie
        );
      }
      if (isRestorableAnonSession(existing, now)) {
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
      // Claimed / handed_off / unexpected — do not restore as anonymous.
      return mintNewSession(
        repository,
        cookieSecret,
        now,
        "replaced",
        options.secureCookie
      );
    }
    // Unknown hash (DB miss) — mint fresh.
    return mintNewSession(
      repository,
      cookieSecret,
      now,
      "replaced",
      options.secureCookie
    );
  }

  return mintNewSession(
    repository,
    cookieSecret,
    now,
    "minted",
    options.secureCookie
  );
}
