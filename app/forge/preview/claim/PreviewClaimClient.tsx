"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { memberForgeTransitionPath } from "@/lib/forge/preview-claim";

export default function PreviewClaimClient({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void fetch("/api/forge/preview/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topicId }),
    })
      .then(async (response) => {
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Unable to save your preview.");
        }
        router.replace(memberForgeTransitionPath(topicId));
        router.refresh();
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to save your preview."
        );
      });
  }, [attempt, router, topicId]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-center text-white">
      <div className="max-w-md" aria-live="polite">
        {error ? (
          <>
            <h1 className="text-3xl font-semibold">Your account is ready.</h1>
            <p className="mt-4 text-sm leading-6 text-red-200" role="alert">
              {error}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setAttempt((current) => current + 1);
                }}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
              >
                Try again
              </button>
              <Link
                href="/coach"
                className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/70"
              >
                Back to Coach
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              TalkForge
            </p>
            <h1 className="mt-5 text-3xl font-semibold">
              Saving your first rep…
            </h1>
            <p className="mt-4 text-sm text-white/50">
              Keep this page open while we link your private session.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
