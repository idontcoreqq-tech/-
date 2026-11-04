import { requireAdmin } from "@/domain/auth";
import { cancelBooking } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const POST = withApi(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  return Response.json(await cancelBooking(id, { by: "admin" }));
});
