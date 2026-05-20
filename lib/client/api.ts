import type { ApiErrorPayload } from "@/lib/types";

export type ApiFailure = ApiErrorPayload & {
  requestId: string;
};

export function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const payload = (data ?? {}) as Partial<ApiErrorPayload>;
    throw {
      status: response.status,
      code: payload.code ?? "UPSTREAM_ERROR",
      message: payload.message ?? `请求失败：${response.status}`,
      action: payload.action,
      requestId: createRequestId()
    } satisfies ApiFailure;
  }
  return data as T;
}

export function extractAssistantText(payload: unknown) {
  const data = payload as {
    choices?: Array<{ message?: { content?: string } }>;
    output_text?: string;
    content?: string;
  };
  return data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.content ?? JSON.stringify(payload, null, 2);
}
