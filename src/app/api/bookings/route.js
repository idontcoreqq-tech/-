import { createBooking } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const POST = withApi(async (request) => {
  const body = await request.json();
  const booking = await createBooking({
    ...body,
    source: "site",
  });
  return Response.json(booking, { status: 201 });
});
