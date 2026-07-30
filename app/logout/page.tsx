import { logoutAction } from "@/app/actions/auth";

/** Destroys the Supabase session and redirects to the landing page. */
export default async function LogoutPage() {
  await logoutAction();
  return null;
}
