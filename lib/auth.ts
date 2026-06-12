import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/lib/types";
import { findUserById } from "@/lib/db";

const cookieName = "study_session";

function getSecret() {
  const raw = process.env.AUTH_SECRET ?? "dev-secret-change-me-for-production";
  return new TextEncoder().encode(raw);
}

export async function createSession(user: Pick<User, "id" | "email" | "name">) {
  const token = await new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());

  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    const userId = verified.payload.sub;
    if (!userId) return null;
    return findUserById(userId);
  } catch {
    return null;
  }
}
