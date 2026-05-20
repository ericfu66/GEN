import { NextResponse } from "next/server";
import type { ApiErrorPayload } from "@/lib/types";

export class AppError extends Error {
  status: number;
  code: ApiErrorPayload["code"];
  action?: ApiErrorPayload["action"];

  constructor(status: number, code: ApiErrorPayload["code"], message: string, action?: ApiErrorPayload["action"]) {
    super(message);
    this.status = status;
    this.code = code;
    this.action = action;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError(504, "TIMEOUT", "请求超时，接口暂时没有响应。", "retry");
  }
  if (error instanceof Error) return new AppError(502, "UPSTREAM_ERROR", "上游接口请求失败，请稍后重试。", "retry");
  return new AppError(500, "UPSTREAM_ERROR", "发生未知错误。", "retry");
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  const payload: ApiErrorPayload = {
    code: appError.code,
    message: appError.message,
    action: appError.action,
    status: appError.status
  };
  return NextResponse.json(payload, { status: appError.status });
}

export function mapUpstreamStatus(status: number): AppError {
  if (status === 401) return new AppError(401, "UNAUTHORIZED", "API Key 错误或已经失效，请检查配置。", "configure");
  if (status === 404) return new AppError(404, "NOT_FOUND", "接口地址或模型端点不存在，请检查 Base URL。", "configure");
  if (status === 429) return new AppError(429, "RATE_LIMITED", "请求过多、余额不足或并发超限，请稍后重试。", "retry");
  return new AppError(status, "UPSTREAM_ERROR", `上游接口返回错误：${status}`, "retry");
}
