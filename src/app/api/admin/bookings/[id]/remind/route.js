import { requireAdmin } from "@/domain/auth";
import { sendManualReminder } from "@/domain/reminders";
import { withApi } from "@/lib/http";

export const POST = withApi(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  return Response.json(await sendManualReminder(id));
});
