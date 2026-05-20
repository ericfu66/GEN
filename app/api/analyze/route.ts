import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { addHistory } from "@/lib/server/db";
import { chatUpstreamFetch, requireConfig } from "@/lib/server/provider";
import { assertSafeModelImageReference } from "@/lib/server/security";

const UPLOAD_PREFIX = "/uploads/";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function historyInputFor(imageUrl: string) {
  return imageUrl.startsWith("data:image/") ? "[uploaded image]" : imageUrl;
}

async function imageInputForModel(request: Request, imageUrl: string) {
  if (imageUrl.startsWith("data:image/")) return imageUrl;

  let uploadPath = "";
  if (imageUrl.startsWith(UPLOAD_PREFIX)) {
    uploadPath = imageUrl;
  } else {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.origin === new URL(request.url).origin && parsed.pathname.startsWith(UPLOAD_PREFIX)) {
        uploadPath = parsed.pathname;
      }
    } catch {
      return imageUrl;
    }
  }

  if (!uploadPath) return imageUrl;

  const filename = path.basename(decodeURIComponent(uploadPath));
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime = IMAGE_MIME_BY_EXT[ext];
  if (!mime) throw new AppError(400, "BAD_REQUEST", "不支持的图片格式。");

  const filePath = path.join(UPLOAD_DIR, filename);
  const relative = path.relative(UPLOAD_DIR, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AppError(400, "BAD_REQUEST", "图片路径无效。");
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    throw new AppError(400, "BAD_REQUEST", "上传的图片不存在，请重新上传。");
  }
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const config = requireConfig(user.config);
    const body = await request.json();
    const imageUrl = assertSafeModelImageReference(String(body.imageUrl ?? ""));
    if (!imageUrl) throw new AppError(400, "BAD_REQUEST", "请先提供图片 URL 或上传图片。");
    const modelImageUrl = await imageInputForModel(request, imageUrl);

    const useSecondary = body.endpoint === "secondary" || (!body.endpoint && config.chatApiBaseUrl && config.chatApiKey);
    const fallback = useSecondary
      ? config.defaultSecondaryChatModel || config.defaultChatModel
      : config.defaultChatModel;
    const model = String(body.model ?? "") || fallback;
    if (!model) throw new AppError(400, "BAD_REQUEST", "没有可用的视觉模型。", "configure");

    const style = String(body.style ?? "detailed");
    const styleInstruction =
      style === "concise"
        ? "Output a single tight prompt (1-2 sentences) that captures the essential subject, style, and mood."
        : style === "structured"
          ? "Output a structured prompt with sections: Subject, Composition, Lighting, Style, Mood, Color palette, Camera/Render, Negative."
          : "Output a single rich, production-ready prompt paragraph capturing subject, composition, style, lighting, color palette, mood, medium and any text or distinctive details.";

    const response = await chatUpstreamFetch(
      config,
      "/v1/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a reverse-prompt engineer for image generation. You receive an image and write a prompt that would let an AI image model recreate it as closely as possible. Return ONLY the prompt text, no explanations, no markdown headings, no preamble."
            },
            {
              role: "user",
              content: [
                { type: "text", text: styleInstruction },
                { type: "image_url", image_url: { url: modelImageUrl } }
              ]
            }
          ]
        })
      },
      90000,
      useSecondary ? "secondary" : "primary"
    );
    const data = await response.json();
    const prompt = String(data?.choices?.[0]?.message?.content ?? "").trim();
    await addHistory(user.id, {
      type: "analyze",
      title: `analyze · ${model}`,
      input: historyInputFor(imageUrl),
      output: { prompt, raw: data },
      status: "success"
    });
    return NextResponse.json({ prompt, raw: data, model });
  } catch (error) {
    return errorResponse(error);
  }
}
