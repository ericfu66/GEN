import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { defaultModelFor, normalizeModels } from "@/lib/model-routing";
import { requireUser } from "@/lib/server/auth";
import { updateUser } from "@/lib/server/db";
import { cleanBaseUrl, safeConfig, upstreamFetch, validateAndLoadModels } from "@/lib/server/provider";
import type { ModelInfo, ProviderConfig } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ config: safeConfig(user.config) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const apiBaseUrl = cleanBaseUrl(String(body.apiBaseUrl ?? ""));
    const apiKey = String(body.apiKey ?? user.config?.apiKey ?? "");
    const models = await validateAndLoadModels(apiBaseUrl, apiKey);

    // Secondary chat endpoint (optional)
    const chatApiBaseUrl = cleanBaseUrl(String(body.chatApiBaseUrl ?? ""));
    const chatApiKey = String(body.chatApiKey ?? user.config?.chatApiKey ?? "");
    let chatModels: ModelInfo[] | undefined = user.config?.chatModels;
    if (chatApiBaseUrl && chatApiKey) {
      try {
        const ephemeral: ProviderConfig = {
          apiBaseUrl: chatApiBaseUrl,
          apiKey: chatApiKey,
          models: [],
          systemPrompt: "",
          contextLimit: 12,
          updatedAt: new Date().toISOString()
        };
        const response = await upstreamFetch(ephemeral, "/v1/models", { method: "GET" }, 20000);
        chatModels = normalizeModels(await response.json());
      } catch {
        chatModels = [];
      }
    } else if (!chatApiBaseUrl) {
      chatModels = [];
    }

    const updatedAt = new Date().toISOString();

    const updated = await updateUser(user.id, (record) => {
      record.config = {
        apiBaseUrl,
        apiKey,
        models,
        defaultChatModel: String(body.defaultChatModel ?? "") || defaultModelFor(models, "chat"),
        defaultImageModel: String(body.defaultImageModel ?? "") || defaultModelFor(models, "image"),
        defaultVideoModel: String(body.defaultVideoModel ?? "") || defaultModelFor(models, "video"),
        chatApiBaseUrl: chatApiBaseUrl || undefined,
        chatApiKey: chatApiKey || undefined,
        chatModels,
        defaultSecondaryChatModel:
          String(body.defaultSecondaryChatModel ?? "") || defaultModelFor(chatModels ?? [], "chat") || undefined,
        systemPrompt: String(
          body.systemPrompt ?? user.config?.systemPrompt ?? "You are a practical creative copilot for AI media generation."
        ),
        contextLimit: Number(body.contextLimit ?? user.config?.contextLimit ?? 12),
        updatedAt
      };
    });

    return NextResponse.json({ config: safeConfig(updated?.config) });
  } catch (error) {
    return errorResponse(error);
  }
}
