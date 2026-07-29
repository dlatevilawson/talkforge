/**
 * Future authentication methods — additive, no redesign required.
 * Phase 1 enables email + password only.
 */

export type AuthProviderId =
  | "email"
  | "google"
  | "apple"
  | "microsoft"
  | "github"
  | "magic_link"
  | "passkey";

export type AuthProviderConfig = {
  id: AuthProviderId;
  label: string;
  enabled: boolean;
  /** Supabase OAuth provider slug when applicable */
  oauthProvider?: "google" | "apple" | "azure" | "github";
};

export const AUTH_PROVIDERS: readonly AuthProviderConfig[] = [
  { id: "email", label: "Email", enabled: true },
  { id: "google", label: "Google", enabled: false, oauthProvider: "google" },
  { id: "apple", label: "Apple", enabled: false, oauthProvider: "apple" },
  {
    id: "microsoft",
    label: "Microsoft",
    enabled: false,
    oauthProvider: "azure",
  },
  { id: "github", label: "GitHub", enabled: false, oauthProvider: "github" },
  { id: "magic_link", label: "Magic link", enabled: false },
  { id: "passkey", label: "Passkey", enabled: false },
] as const;

export function enabledProviders(): AuthProviderConfig[] {
  return AUTH_PROVIDERS.filter((p) => p.enabled);
}
