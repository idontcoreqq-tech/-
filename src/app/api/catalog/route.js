import { getCatalog } from "@/domain/bookingService";
import { withApi } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => Response.json(await getCatalog()));
