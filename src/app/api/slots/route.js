import { getWeekSlots } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const { searchParams } = new URL(request.url);
  return Response.json(
    await getWeekSlots({
      barberId: searchParams.get("barberId"),
      serviceId: searchParams.get("serviceId"),
      fromDate: searchParams.get("fromDate") || undefined,
      days: Number(searchParams.get("days") || 7),
    }),
  );
});
