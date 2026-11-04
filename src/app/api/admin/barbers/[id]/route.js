import { requireAdmin } from "@/domain/auth";
import { editBarber } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const PATCH = withApi(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  return Response.json(await editBarber(id, body));
});
