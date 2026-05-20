"use client";

import { Bot } from "lucide-react";
import type { SafeProviderConfig } from "@/lib/types";

export function ModelPanel({ config }: { config: SafeProviderConfig | null }) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <Bot size={17} strokeWidth={2.5} /> 已缓存模型
        </div>
        <span className="badge badgeAccent">{config?.models.length ?? 0}</span>
      </div>
      <div className="panelBody">
        <div className="modelGrid">
          {(config?.models ?? []).map((model) => (
            <div key={model.id} className="modelCard">
              <div className="modelName" title={model.id}>
                {model.id}
              </div>
              <div className="modelTags">
                {model.features.map((feature) => (
                  <span className="tag" key={feature} data-feature={feature}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!config?.models.length && (
          <div className="hint" style={{ textAlign: "center", padding: "12px 0" }}>
            配置成功后会自动显示 /v1/models 返回的模型。
          </div>
        )}
      </div>
    </div>
  );
}
