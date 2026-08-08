import { redirect } from "next/navigation";

/** Legacy Activity URL — Training History owns session cards at /app/history. */
export default function DashboardRedirectPage() {
  redirect("/app/history");
}
