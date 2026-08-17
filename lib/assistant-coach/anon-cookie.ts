/**
 * Phase 4B.3 — signed HttpOnly anonymous Coach cookie (OD-3).
 *
 * Cookie value: `v1.<rawSecret>.<hmac>`
 *   hmac = base64url(HMAC-SHA256(cookieSecret, "v1." + rawSecret))
 *
 * Cookie carries only the opaque secret + authenticity tag — no session id,
 * user id, profile, or transcript data.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ASSISTANT_COACH_ANON_COOKIE_NAME } from "./config.ts";
import { ASSISTANT_COACH_ANON_TTL_DAYS } from "./session-repository.ts";

export { ASSISTANT_COACH_ANON_COOKIE_NAME };

export const ANON_COOKIE_VERSION = "v1";

export type AnonCookieParseResult =
  | { ok: true; rawSecret: string }
  | { ok: false; reason: "missing" | "malformed" | "tampered" };

export type AnonCookieAttributes = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

function signPayload(rawSecret: string, cookieSecret: string): string {
  return createHmac("sha256", cookieSecret)
    .update(`${ANON_COOKIE_VERSION}.${rawSecret}`, "utf8")
    .digest("base64url");
}

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run a compare against a same-length buffer to reduce timing leakage
    // of length differences on the MAC itself.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function sealAnonCookieValue(
  rawSecret: string,
  cookieSecret: string
): string {
  if (!rawSecret || !cookieSecret) {
    throw new Error("rawSecret and cookieSecret are required to seal cookie.");
  }
  const mac = signPayload(rawSecret, cookieSecret);
  return `${ANON_COOKIE_VERSION}.${rawSecret}.${mac}`;
}

export function parseAnonCookieValue(
  cookieValue: string | undefined | null,
  cookieSecret: string
): AnonCookieParseResult {
  if (cookieValue == null || cookieValue === "") {
    return { ok: false, reason: "missing" };
  }
  const parts = cookieValue.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed" };
  }
  const [version, rawSecret, mac] = parts;
  if (version !== ANON_COOKIE_VERSION || !rawSecret || !mac) {
    return { ok: false, reason: "malformed" };
  }
  // Reject cookie values that look like they embed structured identity fields.
  if (
    rawSecret.includes("user_id") ||
    rawSecret.includes("session_id") ||
    rawSecret.includes("transcript") ||
    rawSecret.includes("profile")
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (!cookieSecret) {
    return { ok: false, reason: "tampered" };
  }
  const expected = signPayload(rawSecret, cookieSecret);
  if (!safeEqualString(mac, expected)) {
    return { ok: false, reason: "tampered" };
  }
  return { ok: true, rawSecret };
}

export function readCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string = ASSISTANT_COACH_ANON_COOKIE_NAME
): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return part.slice(idx + 1).trim();
  }
  return undefined;
}

export function anonCookieMaxAgeSeconds(
  expiresAtIso: string,
  now: Date = new Date()
): number {
  const remainingMs = new Date(expiresAtIso).getTime() - now.getTime();
  const remainingSec = Math.floor(remainingMs / 1000);
  if (remainingSec <= 0) {
    return ASSISTANT_COACH_ANON_TTL_DAYS * 24 * 60 * 60;
  }
  return remainingSec;
}

export function buildAnonCookieAttributes(
  expiresAtIso: string,
  options: { secure?: boolean; now?: Date } = {}
): AnonCookieAttributes {
  const secure =
    options.secure ??
    (process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production");
  return {
    httpOnly: true,
    secure: Boolean(secure),
    sameSite: "lax",
    path: "/",
    maxAge: anonCookieMaxAgeSeconds(expiresAtIso, options.now ?? new Date()),
  };
}

/** Serialize Set-Cookie header value for tests / non-Next callers. */
export function serializeAnonSetCookie(
  sealedValue: string,
  attrs: AnonCookieAttributes
): string {
  const pieces = [
    `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealedValue}`,
    `Path=${attrs.path}`,
    `Max-Age=${attrs.maxAge}`,
    `SameSite=${attrs.sameSite === "lax" ? "Lax" : attrs.sameSite}`,
    "HttpOnly",
  ];
  if (attrs.secure) pieces.push("Secure");
  return pieces.join("; ");
}
