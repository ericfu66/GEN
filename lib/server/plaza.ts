import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PlazaEntry } from "@/lib/types";

type PlazaDb = { prompts: PlazaEntry[] };

const DATA_DIR = process.env.DATA_DIR ?? ".data";
const PLAZA_PATH = path.join(process.cwd(), DATA_DIR, "plaza.json");

async function ensurePlaza() {
  await mkdir(path.dirname(PLAZA_PATH), { recursive: true });
  try {
    await readFile(PLAZA_PATH, "utf8");
  } catch {
    await writeFile(PLAZA_PATH, JSON.stringify({ prompts: [] }, null, 2), "utf8");
  }
}

export async function readPlaza(): Promise<PlazaDb> {
  await ensurePlaza();
  const raw = await readFile(PLAZA_PATH, "utf8");
  return JSON.parse(raw) as PlazaDb;
}

export async function writePlaza(db: PlazaDb) {
  await ensurePlaza();
  await writeFile(PLAZA_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function addPlazaEntry(entry: Omit<PlazaEntry, "id" | "createdAt" | "likes" | "uses">) {
  const db = await readPlaza();
  const record: PlazaEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    likes: 0,
    uses: 0,
    ...entry
  };
  db.prompts = [record, ...db.prompts].slice(0, 500);
  await writePlaza(db);
  return record;
}

export async function incrementUse(id: string) {
  const db = await readPlaza();
  const item = db.prompts.find((p) => p.id === id);
  if (item) {
    item.uses += 1;
    await writePlaza(db);
  }
  return item;
}

export async function toggleLike(id: string, delta: 1 | -1) {
  const db = await readPlaza();
  const item = db.prompts.find((p) => p.id === id);
  if (item) {
    item.likes = Math.max(0, item.likes + delta);
    await writePlaza(db);
  }
  return item;
}
