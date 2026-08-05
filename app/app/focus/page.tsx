import { redirect } from "next/navigation";

/**
 * Legacy focus URL — cards live on Living Profile (IV-UX-009).
 */
export default function FocusPage() {
  redirect("/app/profile#goal");
}
