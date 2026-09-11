"use client";

import { useCallback, useEffect, useState } from "react";
import ApprovalCard from "@/app/components/forge-agent/ApprovalCard";
import CueForm from "@/app/components/forge-agent/CueForm";
import type {
  ForgeAgentAction,
  ForgeAgentPreferences,
} from "@/lib/forge-agent/types";

export default function InboxPage() {
  const [preferences, setPreferences] = useState<ForgeAgentPreferences | null>(
    null
  );
  const [actions, setActions] = useState<ForgeAgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [prefRes, actionRes] = await Promise.all([
      fetch("/api/forge-agent/preferences", { cache: "no-store" }),
      fetch("/api/forge-agent/actions", { cache: "no-store" }),
    ]);
    const prefData = (await prefRes.json()) as {
      preferences?: ForgeAgentPreferences;
      error?: string;
    };
    const actionData = (await actionRes.json()) as {
      actions?: ForgeAgentAction[];
      error?: string;
    };
    if (!prefRes.ok) {
      throw new Error(prefData.error || "Could not load check-in preferences.");
    }
    if (!actionRes.ok) {
      throw new Error(actionData.error || "Could not load check-ins.");
    }
    setPreferences(prefData.preferences ?? null);
    setActions(actionData.actions ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load check-ins."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function toggleOutreach(next: boolean) {
    setToggling(true);
    setError("");
    try {
      const res = await fetch("/api/forge-agent/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachEnabled: next }),
      });
      const data = (await res.json()) as {
        preferences?: ForgeAgentPreferences;
        error?: string;
      };
      if (!res.ok || !data.preferences) {
        throw new Error(data.error || "Could not update outreach.");
      }
      setPreferences(data.preferences);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update outreach."
      );
    } finally {
      setToggling(false);
    }
  }

  const outreachOn = Boolean(preferences?.outreachEnabled);

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-[#c9a95f]">
          Check-ins
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Approve what Forge may send
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Forge only drafts a check-in after you declare a cue. Nothing leaves
          this inbox until you approve or deny it.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Outreach</h2>
        <p className="mt-1.5 text-sm leading-6 text-zinc-400">
          Off by default. In-app only. Forge will not invent events or write
          your Living Profile.
        </p>
        <label className="mt-5 flex items-center gap-3 text-sm text-zinc-100">
          <input
            type="checkbox"
            checked={outreachOn}
            disabled={loading || toggling || !preferences}
            onChange={(event) => void toggleOutreach(event.target.checked)}
            className="size-4 accent-[#c9a95f]"
          />
          Enable in-app check-ins
        </label>
      </section>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading check-ins…</p>
      ) : !outreachOn ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
          <p className="text-sm leading-6 text-zinc-400">
            Enable outreach first. Until then, Forge will not draft check-ins —
            even if you have declared a conversation.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Declare a cue
            </h2>
            <p className="mt-1.5 mb-5 text-sm leading-6 text-zinc-400">
              Name a conversation, follow-up, or homework you already decided
              matters. When it is due, Forge drafts one check-in here.
            </p>
            <CueForm onCreated={() => void load()} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Pending approval
            </h2>
            {actions.length === 0 ? (
              <p className="text-sm leading-6 text-zinc-400">
                No due check-ins yet. When a declared cue’s time arrives, it
                will appear here with why it was sent.
              </p>
            ) : (
              actions.map((action) => (
                <ApprovalCard
                  key={action.id}
                  action={action}
                  onChanged={() => void load()}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
