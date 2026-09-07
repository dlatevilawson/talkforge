"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VoiceArena from "@/app/components/VoiceArena";
import type { CoachTopic } from "@/lib/assistant-coach/coach-topics";
import { previewClaimReturnPath } from "@/lib/forge/preview-claim";
import {
  GUEST_PREVIEW_COMPLETE_BODY,
  GUEST_PREVIEW_COMPLETE_HEADLINE,
  GUEST_PREVIEW_CREATE_ACCOUNT_CTA,
  GUEST_PREVIEW_SIGN_IN_CTA,
} from "@/lib/forge/post-session-copy";

type PreviewBootstrap = {
  status: "unused" | "active" | "completed" | "claimed";
  topicId: string;
  reconnectToken: string;
  version: number;
};

function mintKey(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export default function ForgePreviewClient({ topic }: { topic: CoachTopic }) {
  const mintKeyRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<PreviewBootstrap | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    mintKeyRef.current ??= mintKey();
    void fetch("/api/forge/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": mintKeyRef.current,
      },
      body: JSON.stringify({ topic: topic.id }),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          preview?: PreviewBootstrap;
          error?: string;
        };
        if (!response.ok || !data.preview) {
          throw new Error(data.error || "Could not prepare your Forge preview.");
        }
        if (!cancelled) setPreview(data.preview);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not prepare your Forge preview."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [topic.id]);

  if (error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
          <Link
            href="/coach"
            className="mt-6 inline-block rounded-full border border-white/15 px-6 py-3 text-sm text-white/70"
          >
            Back to Coach
          </Link>
        </div>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
        <p className="text-sm text-white/50">Preparing your private room…</p>
      </main>
    );
  }

  if (preview.status === "completed" || preview.status === "claimed") {
    const claimReturn = previewClaimReturnPath(topic.id);
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
            Preview complete
          </p>
          <h1 className="mt-5 text-3xl font-semibold">
            {preview.status === "completed"
              ? GUEST_PREVIEW_COMPLETE_HEADLINE
              : "Your first Forge rep is saved."}
          </h1>
          <p className="mt-4 leading-7 text-white/55">
            {preview.status === "completed"
              ? GUEST_PREVIEW_COMPLETE_BODY
              : "This browser’s one-session preview has already been used."}
          </p>
          {preview.status === "completed" ? (
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={`/signup?next=${encodeURIComponent(claimReturn)}`}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
              >
                {GUEST_PREVIEW_CREATE_ACCOUNT_CTA}
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(claimReturn)}`}
                className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/80"
              >
                {GUEST_PREVIEW_SIGN_IN_CTA}
              </Link>
            </div>
          ) : null}
          <Link
            href="/coach"
            className="mt-6 inline-block rounded-full border border-white/15 px-6 py-3 text-sm text-white/70"
          >
            Back to Coach
          </Link>
        </div>
      </main>
    );
  }

  return (
    <VoiceArena
      autoStart
      track="hello"
      eventTitle={topic.label}
      successCriteria={topic.context}
      guestPreview={{
        topicId: preview.topicId,
        reconnectToken: preview.reconnectToken,
        version: preview.version,
      }}
    />
  );
}
