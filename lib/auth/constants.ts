/** Cookie / session names for TalkForge guest identity bridge (not a new auth provider). */
export const TF_AUTH_COOKIE = "tf_auth";
export const TF_UID_COOKIE = "tf_uid";
export const TF_ROLE_COOKIE = "tf_role";
export const TF_NAME_COOKIE = "tf_name";

export type UserRole = "member" | "founder";

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
