"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncAuthUserToProfile } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error(
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
        }

        const params = new URLSearchParams(window.location.search);
        const oauthError =
          params.get("error_description") || params.get("error");
        if (oauthError) {
          throw new Error(oauthError);
        }

        const code = params.get("code");
        if (code) {
          const {
            data: { session: existing },
          } = await supabase.auth.getSession();

          if (!existing) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              throw new Error(exchangeError.message);
            }
          }
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Missing OAuth code. Start again from Sign in.");
          }
        }

        const profile = await syncAuthUserToProfile();
        if (cancelled) return;

        if (!profile) {
          throw new Error(
            "GitHub sign-in completed, but no auth session was found."
          );
        }

        router.replace("/dashboard");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not complete GitHub sign-in."
          );
        }
      }
    }

    void finishAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--tf-bg)] px-4 py-16 font-sans text-[var(--tf-fg)] sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          TalkForge
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {error ? "Sign-in failed" : "Finishing GitHub sign-in"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          {error
            ? error
            : "Creating your TalkForge profile and redirecting to the dashboard…"}
        </p>

        {error && (
          <div className="mt-8 space-y-3">
            <Link
              href="/auth"
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
