import { createBooking } from "@/domain/bookingService";
import { readTelegramWebAppUser } from "@/domain/telegramInit";
import { withApi } from "@/lib/http";

export const POST = withApi(async (request) => {
  const body = await request.json();
  const user = readTelegramWebAppUser(body.initData);
  const telegramName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const booking = await createBooking({
    serviceId: body.serviceId,
    barberId: body.barberId,
    date: body.date,
    startTime: body.startTime,
    clientName: body.clientName || telegramName,
    clientPhone: body.clientPhone,
    source: "telegram",
    telegramUserId: user.id,
    telegramChatId: user.id,
  });
  return Response.json(booking, { status: 201 });
});
