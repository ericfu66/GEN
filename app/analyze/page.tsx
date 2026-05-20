"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, ScanSearch, Loader2, ImageIcon, Sparkles, X, ArrowUpRight, Wand2 } from "lucide-react";
import { apiJson, createRequestId, type ApiFailure } from "@/lib/client/api";
import type { SafeProviderConfig } from "@/lib/types";
import { TopBar } from "../components/TopBar";
import { ToastDock } from "../components/ToastDock";

type MeResponse = { user: { id: string; email: string; name: string } | null; config: SafeProviderConfig | null };

function asFailure(error: unknown): ApiFailure {
  if (typeof error === "object" && error && "requestId" in error) return error as ApiFailure;
  return {
    requestId: createRequestId(),
    status: 500,
    code: "UPSTREAM_ERROR",
    message: error instanceof Error ? error.message : "未知错误",
    action: "retry"
  };
}

type Style = "detailed" | "concise" | "structured";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

export default function AnalyzePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [config, setConfig] = useState<SafeProviderConfig | null>(null);
  const [errors, setErrors] = useState<ApiFailure[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState("");
  const [style, setStyle] = useState<Style>("detailed");
  const [endpoint, setEndpoint] = useState<"primary" | "secondary">("primary");
  const [model, setModel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadSeqRef = useRef(0);

  function pushError(e: ApiFailure) {
    setErrors((curr) => [e, ...curr].slice(0, 4));
  }
  function dismissError(id: string) {
    setErrors((curr) => curr.filter((e) => e.requestId !== id));
  }

  useEffect(() => {
    apiJson<MeResponse>("/api/auth/me")
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setConfig(data.config);
        if (data.config?.hasChatApiKey) setEndpoint("secondary");
      })
      .catch((e) => pushError(asFailure(e)));
  }, [router]);

  const primaryModels = (config?.models ?? []).filter((m) => m.features.includes("chat"));
  const secondaryModels = (config?.chatModels ?? []).filter((m) => m.features.includes("chat"));
  const available = endpoint === "secondary" ? secondaryModels : primaryModels;
  const hasSecondary = Boolean(config?.hasChatApiKey || (config?.chatModels && config.chatModels.length > 0));

  async function handleFile(file?: File) {
    if (!file) return;
    const uploadSeq = uploadSeqRef.current + 1;
    uploadSeqRef.current = uploadSeq;
    setUploading(true);
    setResult("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (uploadSeqRef.current !== uploadSeq) return;
      setPreviewUrl(dataUrl);
      setImageUrl(dataUrl);
    } catch (err) {
      if (uploadSeqRef.current !== uploadSeq) return;
      setImageUrl("");
      setPreviewUrl("");
      pushError(asFailure(err));
    } finally {
      if (uploadSeqRef.current === uploadSeq) setUploading(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    try {
      await handleFile(file);
    } finally {
      e.target.value = "";
    }
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    await handleFile(e.dataTransfer.files?.[0]);
  }

  async function analyze(e: FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    setAnalyzing(true);
    setResult("");
    try {
      const data = await apiJson<{ prompt: string }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          imageUrl,
          style,
          endpoint,
          model: model || undefined
        })
      });
      setResult(data.prompt);
    } catch (err) {
      pushError(asFailure(err));
    } finally {
      setAnalyzing(false);
    }
  }

  function copy() {
    if (result) navigator.clipboard.writeText(result);
  }
  function sendToGenerator() {
    if (result) router.push(`/?prompt=${encodeURIComponent(result)}`);
  }

  function clearImage() {
    uploadSeqRef.current += 1;
    setImageUrl("");
    setUploading(false);
    setPreviewUrl("");
    setResult("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!user) return null;

  return (
    <>
      <TopBar user={user} onLogout={() => setUser(null)} />
      <div className="page">
        <div className="heroBand" style={{ marginBottom: 24 }}>
          <div className="heroTop">
            <span className="heroIssue">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              Analyze · 03
            </span>
            <span className="heroRule" />
            <span>Vision → Reproducible Prompt</span>
          </div>
          <h1 className="heroTitle">
            把一张图<em>翻译</em>回提示词。
          </h1>
          <p className="heroSub">
            上传或粘贴 URL，让支持视觉的 LLM 把构图、光线、风格、色调全部解构成一段可复刻的 prompt。
          </p>
        </div>

        <div className="analyzeLayout">
          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">
                <span className="panelNum">A</span>
                <ImageIcon size={16} strokeWidth={2.4} /> 输入
              </div>
              <div className="tabs">
                <button type="button" className={`tab ${imageMode === "upload" ? "tabActive" : ""}`} onClick={() => setImageMode("upload")}>
                  上传
                </button>
                <button type="button" className={`tab ${imageMode === "url" ? "tabActive" : ""}`} onClick={() => setImageMode("url")}>
                  URL
                </button>
              </div>
            </div>
            <form className="panelBody" onSubmit={analyze}>
              {imageMode === "upload" ? (
                <div
                  className={`analyzeDrop ${previewUrl ? "hasImage" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  style={dragging ? { borderColor: "var(--ink)", color: "var(--text)", background: "var(--surface-hover)" } : undefined}
                >
                  {previewUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="" />
                      <button
                        className="button buttonSecondary iconButtonSm"
                        type="button"
                        title="取消图片"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage();
                        }}
                        style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
                      >
                        <X size={13} />
                      </button>
                      {uploading && (
                        <div className="mono" style={{ position: "absolute", left: 10, bottom: 10, zIndex: 2, padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,.58)", color: "#fff" }}>
                          UPLOADING…
                        </div>
                      )}
                    </>
                  ) : uploading ? (
                    <>
                      <Loader2 size={20} className="animateSpin" />
                      <span className="mono">UPLOADING…</span>
                    </>
                  ) : (
                    <>
                      <ScanSearch size={28} />
                      <div>
                        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "var(--text)" }}>
                          拖一张图到这里
                        </div>
                        <div className="mono" style={{ marginTop: 4 }}>OR click to choose</div>
                      </div>
                    </>
                  )}
                  <input ref={fileRef} type="file" hidden onChange={onFile} />
                </div>
              ) : (
                <label className="field">
                  <span>图片 URL</span>
                  <input
                    className="input"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" style={{ marginTop: 10, maxWidth: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} />
                  )}
                </label>
              )}

              <div className="rowWrap" style={{ gap: 14 }}>
                <label className="field" style={{ flex: "1 1 140px" }}>
                  <span>端点</span>
                  <select className="select" value={endpoint} onChange={(e) => setEndpoint(e.target.value as "primary" | "secondary")}>
                    <option value="primary">主端点</option>
                    <option value="secondary" disabled={!hasSecondary}>
                      副端点 {hasSecondary ? "" : "(未配置)"}
                    </option>
                  </select>
                </label>
                <label className="field" style={{ flex: "2 1 220px" }}>
                  <span>视觉模型</span>
                  <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="">默认（推荐 gpt-4o / claude / qwen-vl 等支持视觉的模型）</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field">
                <span>输出风格</span>
                <div className="tabs" style={{ width: "100%" }}>
                  {(["detailed", "concise", "structured"] as Style[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`tab ${style === s ? "tabActive" : ""}`}
                      onClick={() => setStyle(s)}
                      style={{ flex: 1 }}
                    >
                      {s === "detailed" ? "完整段落" : s === "concise" ? "极简一句" : "分块结构化"}
                    </button>
                  ))}
                </div>
              </div>

              <button className="button buttonAccent" disabled={analyzing || !imageUrl.trim()}>
                {analyzing ? <Loader2 size={15} className="animateSpin" /> : <Wand2 size={15} />}
                生成复刻提示词
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">
                <span className="panelNum">B</span>
                <Sparkles size={16} strokeWidth={2.4} /> 复刻提示词
              </div>
              <div className="rowWrap">
                <button className="button buttonSecondary iconButtonSm" onClick={copy} disabled={!result} title="复制" type="button">
                  <Copy size={13} />
                </button>
                <button className="button buttonAccent iconButtonSm" onClick={sendToGenerator} disabled={!result} title="送进工作台" type="button">
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
            <div className="panelBody">
              <div className="analyzePromptOut">
                {result || (
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
                    解析结果会出现在这里。点击「送进工作台」可直接把这段提示词带回 / 文生图。
                  </span>
                )}
              </div>
              {result && (
                <div className="rowWrap">
                  <Link href={`/?prompt=${encodeURIComponent(result)}`} className="button buttonAccent" style={{ flex: 1 }}>
                    <ArrowUpRight size={15} /> 一键复刻这张图
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastDock errors={errors} dismissError={dismissError} />
    </>
  );
}
