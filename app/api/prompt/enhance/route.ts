import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { addHistory } from "@/lib/server/db";
import { chatUpstreamFetch, modelForFeature, requireConfig } from "@/lib/server/provider";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const config = requireConfig(user.config);
    const body = await request.json();
    const useSecondary = body.endpoint === "secondary" || (!body.endpoint && config.chatApiBaseUrl && config.chatApiKey);
    const requested = String(body.model ?? "");
    const fallback = useSecondary
      ? config.defaultSecondaryChatModel || config.defaultChatModel
      : config.defaultChatModel;
    const model = requested || fallback || modelForFeature(config, "chat");
    if (!model) throw new AppError(400, "BAD_REQUEST", "没有可用的 LLM 模型用于提示词润色。", "configure");

    const target = String(body.target ?? "image");
    const prompt = String(body.prompt ?? "");
    const response = await chatUpstreamFetch(
      config,
      "/v1/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You rewrite rough user ideas into production-ready prompts for AI media generation. Return only the improved prompt, no explanations."
            },
            {
              role: "user",
              content: `Target: ${target}\nUser idea: ${prompt}\nMake it detailed, concrete, visually directed, and compatible with gpt-image-2 style prompt writing.`
            }
          ]
        })
      },
      60000,
      useSecondary ? "secondary" : "primary"
    );
    const data = await response.json();
    const enhancedPrompt = data?.choices?.[0]?.message?.content?.trim() ?? "";
    await addHistory(user.id, {
      type: "prompt",
      title: `prompt · ${target}`,
      input: prompt,
      output: { prompt: enhancedPrompt, raw: data },
      status: "success"
    });
    return NextResponse.json({
      prompt: enhancedPrompt,
      raw: data
    });
  } catch (error) {
    return errorResponse(error);
  }
}
