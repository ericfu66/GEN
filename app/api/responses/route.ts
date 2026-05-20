import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/server/auth";
import { requireConfig, upstreamFetch } from "@/lib/server/provider";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const config = requireConfig(user.config);
    const body = await request.json();
    const responseId = String(body.responseId ?? "");
    if (!responseId) throw new AppError(400, "BAD_REQUEST", "缺少 responseId。");

    const response = await upstreamFetch(config, "/v1/responses", {
      method: "POST",
      body: JSON.stringify({ response_id: responseId, id: responseId })
    }, 30000);
    return NextResponse.json(await response.json());
  } catch (error) {
    return errorResponse(error);
  }
}
