/**
 * Phase 4B.3 — mint / restore anonymous Assistant Coach session + cookie.
 * No turn API, LLM, or UI.
 */
import {
  requireAssistantCoachAnonCookieSecret,
} from "@/lib/assistant-coach/config";
import { handleAssistantCoachSessionRequest } from "@/lib/assistant-coach/http-session";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
};

export async function GET(request: Request) {
  return handleAssistantCoachSessionRequest(request, deps);
}

export async function POST(request: Request) {
  return handleAssistantCoachSessionRequest(request, deps);
}
