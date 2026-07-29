"use client";

import { useState } from "react";
import {
  evaluatePassword,
  passwordStrengthLabel,
} from "@/lib/auth/password";

export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  autoComplete = "new-password",
  showStrength = false,
  error,
}: {
  id?: string;
  name?: string;
  label?: string;
  autoComplete?: string;
  showStrength?: boolean;
  error?: string;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const check = evaluatePassword(value);

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-zinc-300">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 pr-14 text-white outline-none focus:border-white/40"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-zinc-400 hover:text-white"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showStrength && value ? (
        <div className="mt-3 space-y-2" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  check.score > i
                    ? check.score >= 3
                      ? "bg-emerald-400"
                      : check.score === 2
                        ? "bg-amber-400"
                        : "bg-red-400"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {passwordStrengthLabel(check.score)}
            {!check.hasSpecial && check.valid
              ? " — add a special character for extra strength"
              : ""}
          </p>
          <ul className="grid grid-cols-2 gap-1 text-[11px] text-zinc-500">
            <li className={check.hasMinLength ? "text-emerald-400/90" : ""}>
              12+ characters
            </li>
            <li className={check.hasUpper ? "text-emerald-400/90" : ""}>
              Uppercase
            </li>
            <li className={check.hasLower ? "text-emerald-400/90" : ""}>
              Lowercase
            </li>
            <li className={check.hasNumber ? "text-emerald-400/90" : ""}>
              Number
            </li>
          </ul>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
