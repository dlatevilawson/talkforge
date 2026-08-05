"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TrainingFocusPicker from "@/app/components/TrainingFocusPicker";
import pickerStyles from "@/app/components/TrainingFocusPicker.module.css";
import type { TrainingFocusOption } from "@/lib/system2/training-focus";
import type { LivingProfile } from "@/lib/system1/types";

/**
 * Optional refine-focus surface (IV-UX-009).
 * Not Continuity Home — one visual pick, member-declared LP write only.
 */
export default function FocusPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<TrainingFocusOption | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/living-profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { profile?: LivingProfile | null };
        if (!cancelled && data.profile) {
          setVersion(data.profile.version);
        }
      } catch {
        /* ignore — save will surface errors */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveFocus(option: TrainingFocusOption | null) {
    if (!option) return;
    if (version === null) {
      setError("Living Profile is still loading. Try again in a moment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/living-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purposeStatement: option.purposeStatement,
          seasonLabels: [option.seasonLabel],
          expectedVersion: version,
        }),
      });
      if (res.status === 409) {
        const conflict = (await res.json()) as { profile?: LivingProfile };
        if (conflict.profile) setVersion(conflict.profile.version);
        setError("Your profile changed elsewhere. Select again to save.");
        setSaving(false);
        return;
      }
      if (!res.ok) {
        setError("Couldn’t save your focus. Try again.");
        setSaving(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Couldn’t save your focus. Check your connection.");
      setSaving(false);
    }
  }

  return (
    <main className="relative mx-auto min-h-[calc(100svh-112px)] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(201,155,74,0.1),_transparent_50%),radial-gradient(ellipse_at_80%_20%,_rgba(127,175,154,0.06),_transparent_40%)]"
      />
      <TrainingFocusPicker
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        eyebrow="Optional"
        title="Set your training focus"
        subtitle="One tap tells your Coach what to train. You can change this anytime — or skip and Begin from Home."
      />

      <div className={pickerStyles.actions}>
        <button
          type="button"
          className={pickerStyles.primary}
          disabled={!selected || saving}
          onClick={() => void saveFocus(selected)}
        >
          {saving ? "Saving…" : "Use this focus"}
        </button>
        <Link href="/app" className={pickerStyles.secondary}>
          Skip — back to training
        </Link>
      </div>
      {error ? (
        <p className={pickerStyles.hint} role="alert">
          {error}
        </p>
      ) : (
        <p className={pickerStyles.hint}>
          Focus is optional. Begin today’s training stays available on Home.
        </p>
      )}
    </main>
  );
}
