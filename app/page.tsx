"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiJson, createRequestId, extractAssistantText, type ApiFailure } from "@/lib/client/api";
import { useWorkspace } from "@/lib/client/store";
import type { ChatMessage, SafeProviderConfig } from "@/lib/types";
import { ConfigPanel } from "./components/ConfigPanel";
import { GenerationPanel, GenFeature } from "./components/GenerationPanel";
import { ChatPanel } from "./components/ChatPanel";
import { ModelPanel } from "./components/ModelPanel";
import { ToastDock } from "./components/ToastDock";
import { TopBar } from "./components/TopBar";

type MeResponse = {
  user: { id: string; email: string; name: string } | null;
  config: SafeProviderConfig | null;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

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

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    config,
    feature,
    prompt,
    output,
    progress,
    busy,
    messages,
    errors,
    setUser,
    setConfig,
    setFeature,
    setPrompt,
    setOutput,
    setProgress,
    setBusy,
    addMessage,
    setMessages,
    pushError,
    dismissError
  } = useWorkspace();

  const [configForm, setConfigForm] = useState({
    apiBaseUrl: "",
    apiKey: "",
    chatApiBaseUrl: "",
    chatApiKey: "",
    defaultChatModel: "",
    defaultSecondaryChatModel: "",
    defaultImageModel: "",
    defaultVideoModel: "",
    systemPrompt: "You are a practical creative copilot for AI media generation.",
    contextLimit: 12
  });
  const [chatInput, setChatInput] = useState("");
  const [chatEndpoint, setChatEndpoint] = useState<"primary" | "secondary">("primary");
  const [chatModel, setChatModel] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState("");
  const [sourceUploading, setSourceUploading] = useState(false);

  const modelsByFeature = useMemo(() => {
    const models = config?.models ?? [];
    return {
      image: models.filter((m) => m.features.includes("image")),
      imageToImage: models.filter((m) => m.features.includes("imageToImage") || m.features.includes("image")),
      video: models.filter((m) => m.features.includes("video"))
    };
  }, [config?.models]);

  const primaryChatModels = useMemo(
    () => (config?.models ?? []).filter((m) => m.features.includes("chat")),
    [config?.models]
  );
  const secondaryChatModels = useMemo(
    () => (config?.chatModels ?? []).filter((m) => m.features.includes("chat")),
    [config?.chatModels]
  );

  useEffect(() => {
    apiJson<MeResponse>("/api/auth/me")
      .then((data) => {
        setLoaded(true);
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setConfig(data.config);
        if (data.config) {
          setConfigForm((current) => ({
            ...current,
            apiBaseUrl: data.config?.apiBaseUrl ?? "",
            chatApiBaseUrl: data.config?.chatApiBaseUrl ?? "",
            defaultChatModel: data.config?.defaultChatModel ?? "",
            defaultSecondaryChatModel: data.config?.defaultSecondaryChatModel ?? "",
            defaultImageModel: data.config?.defaultImageModel ?? "",
            defaultVideoModel: data.config?.defaultVideoModel ?? "",
            systemPrompt: data.config?.systemPrompt ?? current.systemPrompt,
            contextLimit: data.config?.contextLimit ?? current.contextLimit
          }));
          if (data.config.hasChatApiKey) setChatEndpoint("secondary");
        }
      })
      .catch((error) => pushError(asFailure(error)));
  }, [pushError, setConfig, setUser, router]);

  useEffect(() => {
    if (chatEndpoint === "secondary") {
      setChatModel(configForm.defaultSecondaryChatModel || "");
    } else {
      setChatModel(configForm.defaultChatModel || "");
    }
  }, [chatEndpoint, configForm.defaultChatModel, configForm.defaultSecondaryChatModel]);

  // Receive prompt from plaza/analyze via query string
  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p) {
      setPrompt(p);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prompt");
      router.replace(`/?${params.toString()}`);
    }
  }, [searchParams, setPrompt, router]);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await apiJson<{ config: SafeProviderConfig }>("/api/config", {
        method: "PUT",
        body: JSON.stringify(configForm)
      });
      setConfig(data.config);
      setConfigForm((current) => ({ ...current, apiKey: "", chatApiKey: "" }));
    } catch (error) {
      pushError(asFailure(error));
    } finally {
      setBusy(false);
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const data = await apiJson<{ prompt: string }>("/api/prompt/enhance", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          target: feature,
          model: chatModel || undefined,
          endpoint: chatEndpoint
        })
      });
      if (data.prompt) setPrompt(data.prompt);
    } catch (error) {
      pushError(asFailure(error));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!prompt.trim()) return;
    if (feature === "imageToImage" && !sourceImageUrl) return;
    setBusy(true);
    setProgress(feature === "video" ? 18 : 0);
    setOutput("");
    try {
      const model =
        feature === "image" || feature === "imageToImage"
          ? configForm.defaultImageModel || config?.defaultImageModel
          : configForm.defaultVideoModel || config?.defaultVideoModel;
      const data = await apiJson<{ responseId?: string; data: unknown }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          feature,
          prompt,
          model,
          imageUrl: feature === "imageToImage" ? sourceImageUrl : undefined
        })
      });
      setOutput(JSON.stringify(data.data, null, 2));
      if (feature === "video" && data.responseId) await pollVideo(data.responseId);
      else setProgress(100);
    } catch (error) {
      pushError(asFailure(error));
    } finally {
      setBusy(false);
    }
  }

  async function pollVideo(responseId: string) {
    for (let index = 0; index < 20; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      setProgress(Math.min(92, 24 + index * 4));
      const data = await apiJson<Record<string, unknown>>("/api/responses", {
        method: "POST",
        body: JSON.stringify({ responseId })
      });
      setOutput(JSON.stringify(data, null, 2));
      const status = String(data.status ?? data.state ?? "").toLowerCase();
      if (["completed", "succeeded", "done"].includes(status)) {
        setProgress(100);
        return;
      }
      if (["failed", "cancelled", "canceled"].includes(status)) {
        throw new Error("视频任务失败或已取消。");
      }
    }
    throw new Error("视频任务轮询超时，可以稍后使用 responseId 重试。");
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: chatInput.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setBusy(true);
    try {
      const data = await apiJson<unknown>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages,
          model: chatModel || undefined,
          endpoint: chatEndpoint
        })
      });
      addMessage({ role: "assistant", content: extractAssistantText(data) });
    } catch (error) {
      pushError(asFailure(error));
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setConfig(null);
    setMessages([]);
    setOutput("");
  }

  async function handleSourceFile(file?: File) {
    if (!file) return;
    setSourceUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSourceImageUrl(dataUrl);
      setSourcePreviewUrl(dataUrl);
      setOutput("");
    } catch (error) {
      pushError(asFailure(error));
    } finally {
      setSourceUploading(false);
    }
  }

  function clearSourceImage() {
    setSourceImageUrl("");
    setSourcePreviewUrl("");
  }

  if (!loaded) return null;
  if (!user) return null;

  return (
    <>
      <TopBar user={user} onLogout={handleLogout} />
      <div className="page">
        <div className="heroBand">
          <div className="heroTop">
            <span className="heroIssue">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              Workstation · Vol. 02
            </span>
            <span className="heroRule" />
            <span>{new Date().toLocaleDateString("zh-CN")}</span>
          </div>
          <h1 className="heroTitle">
            一个工作台，<em>三件事</em>：
            <br />
            生成 · 对话 · 复刻。
          </h1>
          <p className="heroSub">
            QY Gen 把 BYOK 的多端点 LLM、文生图与文生视频整合在一张桌面上。
            左侧配置端点，中间发起生成，右侧让 LLM 副驾参与你的每一次创作。
          </p>
          <div className="heroMeta">
            <span>
              主端点 · <b>{config?.hasApiKey ? "已就绪" : "未配置"}</b>
            </span>
            <span>
              副 LLM · <b>{config?.hasChatApiKey ? "已就绪" : "可选"}</b>
            </span>
            <span>
              模型 · <b>{config?.models.length ?? 0}</b>
            </span>
            <span>
              对话上下文 · <b>{config?.contextLimit ?? 12}</b> 条
            </span>
          </div>
        </div>

        <main className="shell">
          <section className="column">
            <ConfigPanel
              disabled={!user}
              busy={busy}
              config={config}
              form={configForm}
              setForm={(updater) => setConfigForm(updater as React.SetStateAction<typeof configForm>)}
              onSubmit={saveConfig}
            />
          </section>

          <section className="column">
            <GenerationPanel
              feature={feature as GenFeature}
              setFeature={(f) => setFeature(f as GenFeature)}
              sourceImageUrl={sourceImageUrl}
              sourcePreviewUrl={sourcePreviewUrl}
              sourceUploading={sourceUploading}
              onSourceFile={handleSourceFile}
              onClearSourceImage={clearSourceImage}
              prompt={prompt}
              setPrompt={setPrompt}
              modelsByFeature={modelsByFeature}
              configForm={configForm}
              setConfigForm={(form) => setConfigForm((prev) => ({ ...prev, ...form }))}
              output={output}
              progress={progress}
              busy={busy}
              canRun={Boolean(user && config)}
              onEnhance={enhancePrompt}
              onGenerate={generate}
            />
          </section>

          <section className="column columnChat">
            <ChatPanel
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              busy={busy}
              canRun={Boolean(user && config)}
              onSubmit={sendChat}
              primaryModels={primaryChatModels}
              secondaryModels={secondaryChatModels}
              hasSecondary={Boolean(config?.hasChatApiKey || (config?.chatModels && config.chatModels.length > 0))}
              endpoint={chatEndpoint}
              setEndpoint={setChatEndpoint}
              selectedModel={chatModel}
              setSelectedModel={setChatModel}
            />
            <ModelPanel config={config} />
          </section>
        </main>

        <ToastDock errors={errors} dismissError={dismissError} />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
