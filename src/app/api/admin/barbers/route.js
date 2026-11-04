import { requireAdmin } from "@/domain/auth";
import { createBarber, listAdminBarbers } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdmin();
  return Response.json({ barbers: await listAdminBarbers() });
});

export const POST = withApi(async (request) => {
  await requireAdmin();
  const body = await request.json();
  return Response.json(await createBarber(body), { status: 201 });
});
