import "server-only";

import { AppError } from "@/lib/errors";

const SAFE_IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"]);
const MIME_EXTENSION: Record<string, string> = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const DATA_IMAGE_RE = /^data:image\/([a-z0-9.+-]+);base64,[a-z0-9+/=\s]+$/i;
const UPLOAD_REFERENCE_RE = /^\/uploads\/[a-z0-9._-]+$/i;

function assertSafeUploadReference(imageUrl: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(imageUrl);
  } catch {
    throw new AppError(400, "BAD_REQUEST", "图片地址格式无效。");
  }
  if (!UPLOAD_REFERENCE_RE.test(decoded) || decoded.includes("..")) {
    throw new AppError(400, "BAD_REQUEST", "图片路径无效。");
  }
  return decoded;
}

export function safeUploadExtension(file: File) {
  const byMime = MIME_EXTENSION[file.type.toLowerCase()];
  if (byMime) return byMime;

  const rawExt = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 12);
  return SAFE_IMAGE_EXTENSIONS.has(ext) ? ext : "bin";
}

export function assertSafeModelImageReference(value: string) {
  const imageUrl = value.trim();
  if (!imageUrl) {
    throw new AppError(400, "BAD_REQUEST", "请先提供图片。");
  }

  if (imageUrl.startsWith("/uploads/")) return assertSafeUploadReference(imageUrl);

  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(DATA_IMAGE_RE);
    const subtype = match?.[1]?.toLowerCase();
    if (!match || subtype === "svg+xml") {
      throw new AppError(400, "BAD_REQUEST", "图片数据格式不安全或不受支持。");
    }
    return imageUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new AppError(400, "BAD_REQUEST", "图片地址格式无效。");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(400, "BAD_REQUEST", "图片地址只支持 HTTP 或 HTTPS。");
  }
  if (parsed.username || parsed.password) {
    throw new AppError(400, "BAD_REQUEST", "图片地址不能包含用户名或密码。");
  }
  return parsed.toString();
}

export function assertSafePublicImageReference(value: string) {
  const imageUrl = assertSafeModelImageReference(value);
  if (imageUrl.startsWith("data:")) {
    throw new AppError(400, "BAD_REQUEST", "公开图片不能使用内嵌数据地址。");
  }
  return imageUrl;
}
