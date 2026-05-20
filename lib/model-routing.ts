import type { Feature, ModelInfo } from "@/lib/types";

const IMAGE_MODELS = new Set(["gpt-image-2", "grok-imagine-image", "grok-imagine-image-pro"]);
const VIDEO_MODELS = new Set(["grok-imagine-video", "grok-imagine-video-c"]);

export function inferFeatures(modelId: string): Feature[] {
  const id = modelId.toLowerCase();
  const features = new Set<Feature>();

  if (IMAGE_MODELS.has(id) || id.includes("image") || id.includes("imagine")) {
    features.add("image");
    features.add("imageToImage");
  }
  if (VIDEO_MODELS.has(id) || id.includes("video")) features.add("video");
  if (!features.size || id.includes("gpt") || id.includes("chat") || id.includes("llm") || id.includes("claude") || id.includes("gemini") || id.includes("qwen") || id.includes("deepseek")) features.add("chat");

  return Array.from(features);
}

export function normalizeModels(payload: unknown): ModelInfo[] {
  const data = typeof payload === "object" && payload !== null && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;

  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (typeof item === "string") return { id: item, features: inferFeatures(item) };
      if (!item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") return null;
      const raw = item as { id: string; owned_by?: string; ownedBy?: string };
      return {
        id: raw.id,
        ownedBy: raw.owned_by ?? raw.ownedBy,
        features: inferFeatures(raw.id)
      };
    })
    .filter((model): model is ModelInfo => Boolean(model));
}

export function endpointForFeature(_feature: Feature): string {
  return "/v1/chat/completions";
}

export function defaultModelFor(models: ModelInfo[], feature: Feature): string {
  if (feature === "imageToImage") return defaultModelFor(models, "image");
  return models.find((model) => model.features.includes(feature))?.id ?? "";
}
