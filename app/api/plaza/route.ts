import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { addPlazaEntry, readPlaza } from "@/lib/server/plaza";
import { assertSafePublicImageReference } from "@/lib/server/security";

export async function GET() {
  try {
    const db = await readPlaza();
    return NextResponse.json({ prompts: db.prompts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const prompt = String(body.prompt ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    if (!title || !prompt || !imageUrl) {
      throw new AppError(400, "BAD_REQUEST", "标题、提示词和效果图均为必填。");
    }
    const safeImageUrl = assertSafePublicImageReference(imageUrl);
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 8)
      : [];
    const model = body.model ? String(body.model) : undefined;
    const entry = await addPlazaEntry({
      userId: user.id,
      userName: user.name,
      title: title.slice(0, 80),
      prompt: prompt.slice(0, 4000),
      imageUrl: safeImageUrl,
      model,
      tags
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}
