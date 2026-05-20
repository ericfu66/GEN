import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { readDb, writeDb } from "@/lib/server/db";
import type { UserRecord } from "@/lib/types";

const COOKIE_NAME = "qy_session";
const SECRET = process.env.APP_SECRET ?? "dev-secret-change-me";

function sign(value: string) {
  if (process.env.NODE_ENV === "production" && SECRET === "dev-secret-change-me") {
    throw new AppError(500, "UPSTREAM_ERROR", "APP_SECRET must be set in production.");
  }
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt).hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createUser(email: string, password: string, name: string) {
  const db = await readDb();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some((user) => user.email === normalizedEmail)) {
    throw new AppError(400, "BAD_REQUEST", "该邮箱已经注册。");
  }
  const { hash, salt } = hashPassword(password);
  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0],
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
    history: []
  };
  db.users.push(user);
  await writeDb(db);
  await setSession(user.id);
  return user;
}

export async function login(email: string, password: string) {
  const db = await readDb();
  const user = db.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    throw new AppError(401, "UNAUTHORIZED", "邮箱或密码不正确。");
  }
  await setSession(user.id);
  return user;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const value = `${userId}.${sign(userId)}`;
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return null;
  const [userId, signature] = session.split(".");
  if (!userId || !signature) return null;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(userId));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const db = await readDb();
  return db.users.find((user) => user.id === userId) ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "UNAUTHORIZED", "请先登录。");
  return user;
}

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  };
}
