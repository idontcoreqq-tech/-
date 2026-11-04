import { isAdminRequest } from "@/domain/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: await isAdminRequest() });
}
