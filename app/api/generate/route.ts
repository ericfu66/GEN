import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { endpointForFeature } from "@/lib/model-routing";
import { requireUser } from "@/lib/server/auth";
import { addHistory } from "@/lib/server/db";
import { modelForFeature, requireConfig, upstreamFetch } from "@/lib/server/provider";
import { assertSafeModelImageReference } from "@/lib/server/security";
import type { Feature } from "@/lib/types";

const ALLOWED_FEATURES = new Set<Feature>(["image", "imageToImage", "video"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const config = requireConfig(user.config);
    const body = await request.json();
    const feature = String(body.feature ?? "image") as Feature;
    if (!ALLOWED_FEATURES.has(feature)) throw new AppError(400, "BAD_REQUEST", "不支持的生成类型。");

    const model = modelForFeature(config, feature, body.model);
    if (!model) throw new AppError(400, "BAD_REQUEST", "该功能区没有可用模型。", "configure");

    const prompt = String(body.prompt ?? "");
    const imageUrl =
      feature === "imageToImage" ? assertSafeModelImageReference(String(body.imageUrl ?? "")) : "";
    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (feature === "imageToImage" && imageUrl) {
      content.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const messages = [
      {
        role: "user",
        content
      }
    ];

    const response = await upstreamFetch(
      config,
      endpointForFeature(feature),
      {
        method: "POST",
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          metadata: { feature }
        })
      },
      feature === "video" ? 120000 : 90000
    );

    const data = await response.json();
    await addHistory(user.id, {
      type: feature,
      title: `${feature} · ${model}`,
      input: imageUrl ? `${prompt}\n[reference image attached]` : prompt,
      output: data,
      status: "success"
    });
    return NextResponse.json({
      feature,
      model,
      status: feature === "video" ? "submitted" : "completed",
      responseId: data?.id ?? data?.response_id ?? data?.choices?.[0]?.message?.id,
      data
    });
  } catch (error) {
    return errorResponse(error);
  }
}
