"use client";

import Link from "next/link";
import { useState } from "react";
import type { ForgeAgentAction } from "@/lib/forge-agent/types";

type ApprovalCardProps = {
  action: ForgeAgentAction;
  onChanged: () => void;
};

export default function ApprovalCard({ action, onChanged }: ApprovalCardProps) {
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState("");
  const href = action.payload.practiceHref || "/app/practice?start=1";

  async function decide(kind: "approve" | "deny") {
    setPending(kind);
    setError("");
    try {
      const res = await fetch(`/api/forge-agent/actions/${action.id}/${kind}`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not update that check-in.");
      }
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update that check-in."
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-[#c9a95f]">
        Pending check-in
      </p>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        {action.payload.whySent}
      </p>
      <p className="mt-3 text-base leading-6 text-zinc-100">
        {action.payload.body}
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void decide("approve")}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {pending === "approve" ? "Approving…" : "Approve"}
        </button>
        <Link
          href={href}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Practice
        </Link>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void decide("deny")}
          className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline disabled:opacity-50"
        >
          {pending === "deny" ? "Stopping…" : "Deny"}
        </button>
      </div>
    </article>
  );
}
