import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "kromka_admin";

function secret() {
  return process.env.ADMIN_PASSWORD || "kromka";
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verifyPassword(password) {
  const expected = secret();
  const left = Buffer.from(String(password));
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createSessionToken() {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  if (!token || !token.includes(".")) {
    return false;
  }
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return false;
  }
  return Number(payload) > Date.now();
}

export async function setAdminCookie(token) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdminRequest() {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdminRequest())) {
    const error = new Error("Нужен вход в админку");
    error.status = 401;
    throw error;
  }
}
