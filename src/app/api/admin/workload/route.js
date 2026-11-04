import { requireAdmin } from "@/domain/auth";
import { getWorkload } from "@/domain/workloadService";
import { withApi } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  await requireAdmin();
  const weekStart = new URL(request.url).searchParams.get("weekStart") || undefined;
  return Response.json(await getWorkload(weekStart));
});