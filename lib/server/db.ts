import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HistoryRecord, UserRecord } from "@/lib/types";

type Database = {
  users: UserRecord[];
};

const DATA_DIR = process.env.DATA_DIR ?? ".data";
const DB_PATH = path.join(process.cwd(), DATA_DIR, "db.json");

async function ensureDb() {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

export async function readDb(): Promise<Database> {
  await ensureDb();
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as Database;
}

export async function writeDb(db: Database) {
  await ensureDb();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function updateUser(userId: string, updater: (user: UserRecord) => UserRecord | void) {
  const db = await readDb();
  const index = db.users.findIndex((user) => user.id === userId);
  if (index < 0) return null;
  const next = updater(db.users[index]) ?? db.users[index];
  db.users[index] = next;
  await writeDb(db);
  return next;
}

export async function addHistory(userId: string, record: Omit<HistoryRecord, "id" | "createdAt">) {
  return updateUser(userId, (user) => {
    user.history = [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...record
      },
      ...(user.history ?? [])
    ].slice(0, 200);
  });
}

export async function clearHistory(userId: string) {
  return updateUser(userId, (user) => {
    user.history = [];
  });
}
