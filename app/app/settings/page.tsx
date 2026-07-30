"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [name, setName] = useState("");

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { displayName?: string | null }) => {
        setName(d.displayName || "");
      })
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-xl text-zinc-400">
        Account preferences for your practice identity. Deeper account systems
        arrive with production auth — not a second provider bolted on.
      </p>
      <dl className="mt-10 space-y-4 text-sm">
        <div>
          <dt className="text-zinc-500">Display name</dt>
          <dd className="mt-1 text-zinc-200">{name || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Profile</dt>
          <dd className="mt-1">
            <Link href="/app/profile" className="text-blue-300 underline">
              Open profile
            </Link>
          </dd>
        </div>
      </dl>
    </div>
  );
}
