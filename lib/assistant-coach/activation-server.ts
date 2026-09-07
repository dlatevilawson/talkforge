import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ActivationLivingProfileStore } from "./activation";
import { ensurePersistedLivingProfile } from "../system1/ensure-living-profile";
import {
  LIVING_PROFILE_SELECT,
  mapLivingProfileRow,
  memberLivingProfileDbPayload,
  type LivingProfileRow,
} from "../system1/persistence";

export function createActivationLivingProfileStore(
  supabase: SupabaseClient,
  user: User
): ActivationLivingProfileStore {
  return {
    async loadOrCreate() {
      const ensured = await ensurePersistedLivingProfile(supabase, user);
      if (!ensured.tableReady || !ensured.profile) {
        throw new Error("Living Profile is unavailable.");
      }
      return ensured.profile;
    },

    async saveIfVersion(profile, expectedVersion) {
      const nextVersion = Math.max(1, expectedVersion + 1);
      const payload = memberLivingProfileDbPayload({
        ...profile,
        userId: user.id,
        version: nextVersion,
      });
      const { data, error } = await supabase
        .from("living_profiles")
        .update({ ...payload, version: nextVersion })
        .eq("user_id", user.id)
        .eq("version", expectedVersion)
        .select(LIVING_PROFILE_SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapLivingProfileRow(data as LivingProfileRow) : null;
    },

    async markOnboardingComplete() {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    },
  };
}
