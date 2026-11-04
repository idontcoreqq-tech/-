import { readAsset, writeAsset } from "@/lib/objectStorage";
import { withApi } from "@/lib/http";

export const dynamic = "force-dynamic";

const KEY = "health/app.txt";

export const GET = withApi(async () => {
  await writeAsset(KEY, "kromka", "text/plain");
  const text = await readAsset(KEY);
  return Response.json({ ok: text === "kromka", bucket: "assets" });
});