"use client";

import { FormEvent } from "react";
import { RefreshCw, Loader2, Plug } from "lucide-react";
import type { SafeProviderConfig } from "@/lib/types";

export function ConfigPanel(props: {
  disabled: boolean;
  busy: boolean;
  config: SafeProviderConfig | null;
  form: Record<string, string | number>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string | number>>>;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <span className="panelNum">00</span>
          <RefreshCw size={16} strokeWidth={2.4} /> BYOK 配置
        </div>
        <span className={`badge ${props.config?.hasApiKey ? "badgeSuccess" : ""}`}>
          {props.config?.hasApiKey ? "已保存 Key" : "未配置"}
        </span>
      </div>
      <form className="panelBody" onSubmit={props.onSubmit}>
        <div className="mono" style={{ color: "var(--text-muted)", marginBottom: -4 }}>
          A — Primary endpoint · 图像/视频
        </div>
        <label className="field">
          <span>API Base URL</span>
          <input
            className="input"
            disabled={props.disabled}
            placeholder="https://api.example.com"
            value={String(props.form.apiBaseUrl)}
            onChange={(e) => props.setForm((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>API Key</span>
          <input
            className="input"
            disabled={props.disabled}
            type="password"
            placeholder={props.config?.hasApiKey ? "留空则沿用已保存 Key" : "sk-..."}
            value={String(props.form.apiKey)}
            onChange={(e) => props.setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
          />
        </label>

        <div className="mono" style={{ color: "var(--text-muted)", marginTop: 8 }}>
          B — Secondary LLM endpoint · 仅 Chat / 图像解析（可选）
        </div>
        <label className="field">
          <span>
            <Plug size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Chat API Base URL（可选）
          </span>
          <input
            className="input"
            disabled={props.disabled}
            placeholder="https://api.another.com（留空则沿用主端点）"
            value={String(props.form.chatApiBaseUrl ?? "")}
            onChange={(e) => props.setForm((prev) => ({ ...prev, chatApiBaseUrl: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Chat API Key（可选）</span>
          <input
            className="input"
            disabled={props.disabled}
            type="password"
            placeholder={props.config?.hasChatApiKey ? "留空则沿用已保存 Key" : "sk-..."}
            value={String(props.form.chatApiKey ?? "")}
            onChange={(e) => props.setForm((prev) => ({ ...prev, chatApiKey: e.target.value }))}
          />
        </label>

        <div className="mono" style={{ color: "var(--text-muted)", marginTop: 8 }}>
          C — 偏好
        </div>
        <label className="field">
          <span>System Prompt</span>
          <textarea
            className="textarea"
            disabled={props.disabled}
            value={String(props.form.systemPrompt)}
            onChange={(e) => props.setForm((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            style={{ minHeight: 80 }}
          />
        </label>
        <label className="field">
          <span>上下文携带条数</span>
          <input
            className="input"
            disabled={props.disabled}
            type="number"
            min={1}
            max={50}
            value={Number(props.form.contextLimit)}
            onChange={(e) => props.setForm((prev) => ({ ...prev, contextLimit: Number(e.target.value) }))}
          />
        </label>
        <button className="button buttonAccent" disabled={props.disabled || props.busy}>
          {props.busy ? <Loader2 size={15} className="animateSpin" /> : <RefreshCw size={15} />}
          校验并拉取模型
        </button>
        <div className="hint">
          保存时服务端会请求两个端点的 /v1/models，按模型名映射到对话、图像和视频功能区。
        </div>
      </form>
    </div>
  );
}
