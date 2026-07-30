"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { destroySession } from "@/lib/auth/client";
import { trackAuthEvent } from "@/lib/auth/analytics";

type SessionPayload = {
  authenticated?: boolean;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  profile?: {
    emailVerified?: boolean;
    accountStatus?: string;
    onboardingComplete?: boolean;
  } | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: SessionPayload) => {
        if (!cancelled) setSession(d);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    trackAuthEvent("auth_logout");
    await destroySession();
    router.push("/");
    router.refresh();
  }

  const email = session?.email?.trim() || "—";
  const name = session?.displayName?.trim() || "—";
  const verified = Boolean(session?.profile?.emailVerified);
  const status = session?.profile?.accountStatus || "—";

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-xl text-zinc-400">
        Your TalkForge account — email/password identity, verification, and
        session controls. One authentication system for the Gym and authorized
        staff surfaces.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading account…</p>
      ) : (
        <dl className="mt-10 max-w-xl space-y-5 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <dt className="text-zinc-500">Email</dt>
            <dd className="mt-1 text-zinc-100">{email}</dd>
            <p className="mt-2 text-xs text-zinc-500">
              {verified ? "Email verified" : "Email not verified"}
              {status !== "—" ? ` · Status: ${status}` : ""}
            </p>
          </div>

          <div>
            <dt className="text-zinc-500">Display name</dt>
            <dd className="mt-1 text-zinc-200">{name}</dd>
          </div>

          <div>
            <dt className="text-zinc-500">Profile</dt>
            <dd className="mt-1">
              <Link href="/app/profile" className="text-blue-300 underline">
                Open profile
              </Link>
            </dd>
          </div>

          <div>
            <dt className="text-zinc-500">Password</dt>
            <dd className="mt-1 space-x-4">
              <Link
                href="/change-password?next=/app/settings"
                className="text-blue-300 underline"
              >
                Change password
              </Link>
              <Link href="/forgot-password" className="text-zinc-400 underline">
                Reset via email
              </Link>
            </dd>
          </div>

          {!verified ? (
            <div>
              <dt className="text-zinc-500">Verification</dt>
              <dd className="mt-1">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(session?.email || "")}`}
                  className="text-blue-300 underline"
                >
                  Verify email
                </Link>
              </dd>
            </div>
          ) : null}

          <div className="pt-4">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </dl>
      )}
    </div>
  );
}
