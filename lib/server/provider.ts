import "server-only";

import { AppError, mapUpstreamStatus } from "@/lib/errors";
import { normalizeModels } from "@/lib/model-routing";
import type { Feature, ProviderConfig } from "@/lib/types";

export function safeConfig(config?: ProviderConfig) {
  if (!config) return null;
  const { apiKey, chatApiKey, ...rest } = config;
  return { ...rest, hasApiKey: Boolean(apiKey), hasChatApiKey: Boolean(chatApiKey) };
}

export function requireConfig(config?: ProviderConfig) {
  if (!config?.apiBaseUrl || !config.apiKey) {
    throw new AppError(400, "BAD_REQUEST", "请先配置 API Base URL 和 API Key。", "configure");
  }
  return config;
}

export function cleanBaseUrl(url: string) {
  const cleaned = url.trim().replace(/\/+$/, "");
  if (!cleaned) return "";
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new AppError(400, "BAD_REQUEST", "API Base URL 格式无效。", "configure");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(400, "BAD_REQUEST", "API Base URL 只支持 HTTP 或 HTTPS。", "configure");
  }
  if (parsed.username || parsed.password) {
    throw new AppError(400, "BAD_REQUEST", "API Base URL 不能包含用户名或密码。", "configure");
  }
  return cleaned;
}

export async function upstreamFetch(config: ProviderConfig, endpoint: string, init?: RequestInit, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${cleanBaseUrl(config.apiBaseUrl)}${endpoint}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) throw mapUpstreamStatus(response.status);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export type EndpointChoice = "primary" | "secondary";

export async function chatUpstreamFetch(
  config: ProviderConfig,
  endpoint: string,
  init?: RequestInit,
  timeoutMs = 90000,
  preferred: EndpointChoice = "secondary"
) {
  const useSecondary = preferred === "secondary" && config.chatApiBaseUrl && config.chatApiKey;
  const baseUrl = useSecondary ? cleanBaseUrl(config.chatApiBaseUrl!) : cleanBaseUrl(config.apiBaseUrl);
  const apiKey = useSecondary ? config.chatApiKey! : config.apiKey;
  if (!baseUrl || !apiKey) {
    throw new AppError(400, "BAD_REQUEST", "请先配置 API 端点和 Key。", "configure");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) throw mapUpstreamStatus(response.status);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateAndLoadModels(apiBaseUrl: string, apiKey: string) {
  const config = {
    apiBaseUrl: cleanBaseUrl(apiBaseUrl),
    apiKey,
    models: [],
    systemPrompt: "You are a practical creative copilot for AI media generation.",
    contextLimit: 12,
    updatedAt: new Date().toISOString()
  };
  const response = await upstreamFetch(config, "/v1/models", { method: "GET" }, 20000);
  const models = normalizeModels(await response.json());
  return models;
}

export function modelForFeature(config: ProviderConfig, feature: Feature, requestedModel?: string) {
  if (requestedModel) return requestedModel;
  if (feature === "chat") return config.defaultSecondaryChatModel || config.defaultChatModel;
  if (feature === "image" || feature === "imageToImage") return config.defaultImageModel;
  return config.defaultVideoModel;
}

export function chatModelPool(config: ProviderConfig) {
  const primary = (config.models ?? []).filter((m) => m.features.includes("chat"));
  const secondary = (config.chatModels ?? []).filter((m) => m.features.includes("chat"));
  return { primary, secondary };
}
