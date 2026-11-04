import { createSessionToken, setAdminCookie, verifyPassword } from "@/domain/auth";
import { withApi } from "@/lib/http";

export const POST = withApi(async (request) => {
  const body = await request.json();
  if (!verifyPassword(body.password)) {
    return Response.json({ error: "Неверный пароль" }, { status: 401 });
  }
  await setAdminCookie(createSessionToken());
  return Response.json({ ok: true });
});
