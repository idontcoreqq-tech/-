import { NextResponse } from "next/server";

export function jsonError(error) {
  const status = error.status || 500;
  return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status });
}

export function withApi(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return jsonError(error);
    }
  };
}
