"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./api";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

function parseSetCookie(setCookie: string) {
  const [pair, ...attrParts] = setCookie.split(";").map((part) => part.trim());
  const eq = pair.indexOf("=");
  const name = pair.slice(0, eq);
  const value = pair.slice(eq + 1);

  const attrs: Record<string, string | boolean> = {};
  for (const attr of attrParts) {
    const [key, val] = attr.split("=");
    attrs[key.toLowerCase()] = val ?? true;
  }

  return { name, value, attrs };
}

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const username = formData.get("username");
  const password = formData.get("password");

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body?.error ?? "Invalid username or password" };
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookies.map(parseSetCookie).find((c) => c.name === SESSION_COOKIE);

  if (sessionCookie) {
    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, sessionCookie.value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: sessionCookie.attrs["max-age"] ? Number(sessionCookie.attrs["max-age"]) : undefined,
    });
  }

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (session) {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      headers: { Cookie: `${SESSION_COOKIE}=${session.value}` },
      cache: "no-store",
    }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
