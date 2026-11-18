import { requireApiUser } from "@/lib/auth/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { handleAssessmentCompletion } from "@/lib/ce/assessment-completion-handler";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleAssessmentCompletion(req, {
    requireUser: requireApiUser,
    createMemberClient: createServerSupabaseClient,
    createAdminClient: createAdminSupabaseClient,
  });
}
