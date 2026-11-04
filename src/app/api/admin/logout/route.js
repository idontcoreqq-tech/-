import { clearAdminCookie } from "@/domain/auth";

export async function POST() {
  await clearAdminCookie();
  return Response.json({ ok: true });
}
