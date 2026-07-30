import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--tf-bg)] text-[var(--tf-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,155,74,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.08),_transparent_50%)]"
      />
      <main className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-16">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--tf-gold)]"
        >
          TalkForge
        </Link>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        ) : null}
        <div className="mt-10">{children}</div>
        {footer ? <div className="mt-6 text-sm text-zinc-500">{footer}</div> : null}
        <p className="mt-10">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← TalkForge home
          </Link>
        </p>
      </main>
    </div>
  );
}

export function AuthInput({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="block text-sm text-zinc-300">
      {label}
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
      />
      {error ? (
        <span className="mt-2 block text-sm text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function AuthSubmit({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthAlert({
  message,
  tone = "error",
}: {
  message?: string;
  tone?: "error" | "success";
}) {
  if (!message) return null;
  return (
    <p
      className={`text-sm ${tone === "success" ? "text-emerald-300" : "text-red-300"}`}
      role="alert"
    >
      {message}
    </p>
  );
}
