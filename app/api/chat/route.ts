import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { addHistory } from "@/lib/server/db";
import { chatUpstreamFetch, modelForFeature, requireConfig } from "@/lib/server/provider";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const config = requireConfig(user.config);
    const body = await request.json();
    const messages = (Array.isArray(body.messages) ? body.messages : []) as ChatMessage[];

    const useSecondary = body.endpoint === "secondary" || (!body.endpoint && config.chatApiBaseUrl && config.chatApiKey);
    const requested = String(body.model ?? "");
    const fallback = useSecondary
      ? config.defaultSecondaryChatModel || config.defaultChatModel
      : config.defaultChatModel;
    const model = requested || fallback;
    if (!model) throw new AppError(400, "BAD_REQUEST", "没有可用的对话模型。", "configure");

    const limitedMessages = messages.slice(-Math.max(1, config.contextLimit));
    const response = await chatUpstreamFetch(
      config,
      "/v1/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: config.systemPrompt },
            ...limitedMessages.filter((message) => message.role !== "system")
          ],
          temperature: body.temperature ?? 0.7
        })
      },
      90000,
      useSecondary ? "secondary" : "primary"
    );
    const data = await response.json();
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    await addHistory(user.id, {
      type: "chat",
      title: `chat · ${model}`,
      input: lastUserMessage,
      output: data,
      status: "success"
    });
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
