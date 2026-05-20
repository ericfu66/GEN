"use client";

import { FormEvent } from "react";
import { Loader2, MessageSquareText, Send, Plug } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

export function ChatPanel(props: {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  busy: boolean;
  canRun: boolean;
  onSubmit: (event: FormEvent) => void;
  // model + endpoint selection
  primaryModels: Array<{ id: string }>;
  secondaryModels: Array<{ id: string }>;
  hasSecondary: boolean;
  endpoint: "primary" | "secondary";
  setEndpoint: (e: "primary" | "secondary") => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
}) {
  const available = props.endpoint === "secondary" ? props.secondaryModels : props.primaryModels;
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <span className="panelNum">02</span>
          <MessageSquareText size={16} strokeWidth={2.4} /> LLM 副驾
        </div>
        <span className="badge">{props.messages.length} 条上下文</span>
      </div>
      <form className="panelBody" onSubmit={props.onSubmit}>
        <div className="rowWrap" style={{ alignItems: "stretch" }}>
          <label className="field" style={{ flex: "1 1 140px" }}>
            <span>
              <Plug size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              端点 · Endpoint
            </span>
            <select
              className="select"
              value={props.endpoint}
              onChange={(e) => props.setEndpoint(e.target.value as "primary" | "secondary")}
            >
              <option value="primary">主端点</option>
              <option value="secondary" disabled={!props.hasSecondary}>
                副端点 {props.hasSecondary ? "" : "(未配置)"}
              </option>
            </select>
          </label>
          <label className="field" style={{ flex: "2 1 200px" }}>
            <span>模型 · Model</span>
            <select
              className="select"
              value={props.selectedModel}
              onChange={(e) => props.setSelectedModel(e.target.value)}
            >
              <option value="">默认</option>
              {available.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="chatLog">
          {props.messages.length === 0 && (
            <div className="hint" style={{ textAlign: "center", margin: "auto 0", padding: "20px 0", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "var(--text-muted)" }}>
              一个空白的对话框，
              <br />
              等待一个不平凡的想法。
            </div>
          )}
          {props.messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`message ${message.role === "user" ? "messageUser" : "messageAssistant"}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="messageRole">{message.role === "user" ? "You" : "Assistant"}</div>
              {message.content}
            </div>
          ))}
        </div>
        <div className="row">
          <input
            className="input"
            value={props.chatInput}
            onChange={(e) => props.setChatInput(e.target.value)}
            placeholder="和 LLM 讨论创意..."
          />
          <button
            className="button buttonAccent iconButton"
            disabled={!props.canRun || props.busy || !props.chatInput.trim()}
            title="发送"
          >
            {props.busy ? <Loader2 size={16} className="animateSpin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
