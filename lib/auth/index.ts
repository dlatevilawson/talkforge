/** Client-safe auth exports. Server-only APIs: `@/lib/auth/session`, `@/lib/auth/roles`. */
export { ensureGuestUser, updateDisplayName } from "./guest";
export { migrateGuestPracticeData } from "./migrate-guest";
export type { UserRole, AccountStatus } from "./constants";
export {
  APP_ROLES,
  FOUNDER_PORTAL_ROLES,
  APP_ACCESS_ROLES,
  getSiteUrl,
} from "./constants";
export {
  canAccessApp,
  canAccessFounderPortal,
  hasPermission,
  permissionsForRole,
} from "./roles";
export { evaluatePassword, assertPasswordPolicy } from "./password";
export { AUTH_PROVIDERS, enabledProviders } from "./providers";
