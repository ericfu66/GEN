import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { safeUploadExtension } from "@/lib/server/security";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "BAD_REQUEST", "未收到文件。");

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = safeUploadExtension(file);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    return errorResponse(error);
  }
}
