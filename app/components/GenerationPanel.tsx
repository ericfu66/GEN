"use client";

import { ImageIcon, Sparkles, Send, Loader2, Video, ImagePlus, X } from "lucide-react";

const FEATURE_META = {
  image: { label: "文生图", icon: ImageIcon, desc: "Text → Image" },
  imageToImage: { label: "图生图", icon: ImagePlus, desc: "Image → Image" },
  video: { label: "文生视频", icon: Video, desc: "Text → Video" }
} as const;

export type GenFeature = "image" | "imageToImage" | "video";

export function GenerationPanel(props: {
  feature: GenFeature;
  setFeature: (feature: GenFeature) => void;
  sourceImageUrl: string;
  sourcePreviewUrl: string;
  sourceUploading: boolean;
  onSourceFile: (file?: File) => void;
  onClearSourceImage: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  modelsByFeature: Record<string, Array<{ id: string }>>;
  configForm: Record<string, string | number>;
  setConfigForm: (form: Record<string, string | number>) => void;
  output: string;
  progress: number;
  busy: boolean;
  canRun: boolean;
  onEnhance: () => void;
  onGenerate: () => void;
}) {
  const Icon = FEATURE_META[props.feature].icon;
  const modelKey = props.feature === "video" ? "defaultVideoModel" : "defaultImageModel";

  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          <span className="panelNum">01</span>
          <Icon size={16} strokeWidth={2.4} /> 生成控制台
        </div>
        <span className="badge badgeAccent">{FEATURE_META[props.feature].desc}</span>
      </div>
      <div className="panelBody">
        <div className="tabs">
          {(Object.keys(FEATURE_META) as Array<GenFeature>).map((item) => {
            const ItemIcon = FEATURE_META[item].icon;
            return (
              <button
                key={item}
                type="button"
                className={`tab ${props.feature === item ? "tabActive" : ""}`}
                onClick={() => props.setFeature(item)}
              >
                <ItemIcon size={13} strokeWidth={2.2} />
                {FEATURE_META[item].label}
              </button>
            );
          })}
        </div>
        {props.feature === "imageToImage" && (
          <div className="field">
            <span>参考图 · Image Input</span>
            <div
              className={`imageInputSlot ${props.sourcePreviewUrl ? "hasImage" : ""}`}
              onClick={() => document.getElementById("source-image-input")?.click()}
            >
              {props.sourcePreviewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={props.sourcePreviewUrl} alt="" />
                  <button
                    className="button buttonSecondary iconButtonSm"
                    type="button"
                    title="取消参考图"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onClearSourceImage();
                    }}
                  >
                    <X size={13} />
                  </button>
                </>
              ) : props.sourceUploading ? (
                <>
                  <Loader2 size={18} className="animateSpin" />
                  <span className="mono">READING...</span>
                </>
              ) : (
                <>
                  <ImagePlus size={22} />
                  <span className="mono">点击上传参考图</span>
                </>
              )}
              <input
                id="source-image-input"
                type="file"
                hidden
                onChange={(event) => {
                  props.onSourceFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        )}
        <label className="field">
          <span>模型 · Model</span>
          <select
            className="select"
            value={String(props.configForm[modelKey] ?? "")}
            onChange={(e) => props.setConfigForm({ ...props.configForm, [modelKey]: e.target.value })}
          >
            <option value="">自动选择第一个</option>
            {props.modelsByFeature[props.feature === "imageToImage" ? "image" : props.feature]?.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Prompt · 提示词</span>
          <textarea
            className="textarea"
            value={props.prompt}
            onChange={(e) => props.setPrompt(e.target.value)}
            placeholder="输入简单想法，再用魔法按钮润色为高质量提示词。"
          />
        </label>
        <div className="rowWrap">
          <button
            className="button buttonSecondary"
            disabled={!props.canRun || props.busy || !props.prompt.trim()}
            onClick={props.onEnhance}
            type="button"
          >
            <Sparkles size={15} /> 一键魔法
          </button>
          <button
            className="button buttonAccent"
            disabled={!props.canRun || props.busy || !props.prompt.trim() || (props.feature === "imageToImage" && !props.sourceImageUrl)}
            onClick={props.onGenerate}
            type="button"
            style={{ flex: 1 }}
          >
            {props.busy ? <Loader2 size={15} className="animateSpin" /> : <Send size={15} />} 发起生成
          </button>
        </div>
        {props.feature === "video" && (
          <div className="field">
            <span>视频任务进度</span>
            <div className="progress">
              <span className="progressBar" style={{ width: `${props.progress}%` }} />
            </div>
          </div>
        )}
        <div className="output">
          {props.output || "生成结果会显示在这里。图片/视频接口返回的 URL、任务 ID 或原始响应都会保留，便于排错和复用。"}
        </div>
      </div>
    </div>
  );
}
