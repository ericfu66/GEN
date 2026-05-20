"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Heart, Plus, Loader2, Upload, X, ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { apiJson, type ApiFailure } from "@/lib/client/api";
import type { PlazaEntry, SafeProviderConfig } from "@/lib/types";
import { TopBar } from "../components/TopBar";
import { ToastDock } from "../components/ToastDock";

type MeResponse = { user: { id: string; email: string; name: string } | null; config: SafeProviderConfig | null };

function asFailure(error: unknown): ApiFailure {
  if (typeof error === "object" && error && "requestId" in error) return error as ApiFailure;
  return {
    requestId: crypto.randomUUID(),
    status: 500,
    code: "UPSTREAM_ERROR",
    message: error instanceof Error ? error.message : "未知错误",
    action: "retry"
  };
}

export default function PlazaPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [prompts, setPrompts] = useState<PlazaEntry[]>([]);
  const [errors, setErrors] = useState<ApiFailure[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<PlazaEntry | null>(null);

  function pushError(e: ApiFailure) {
    setErrors((curr) => [e, ...curr].slice(0, 4));
  }
  function dismissError(id: string) {
    setErrors((curr) => curr.filter((e) => e.requestId !== id));
  }

  useEffect(() => {
    apiJson<MeResponse>("/api/auth/me").then((data) => setUser(data.user)).catch(() => {});
    apiJson<{ prompts: PlazaEntry[] }>("/api/plaza")
      .then((data) => setPrompts(data.prompts))
      .catch((e) => pushError(asFailure(e)));
  }, []);

  const filtered = filter === "all" ? prompts : prompts.filter((p) => p.tags.includes(filter));
  const allTags = Array.from(new Set(prompts.flatMap((p) => p.tags))).slice(0, 12);

  async function reusePrompt(entry: PlazaEntry) {
    try {
      await apiJson(`/api/plaza/${entry.id}`, { method: "POST", body: JSON.stringify({ action: "use" }) });
    } catch {}
    router.push(`/?prompt=${encodeURIComponent(entry.prompt)}`);
  }

  async function like(entry: PlazaEntry) {
    try {
      await apiJson<{ entry: PlazaEntry }>(`/api/plaza/${entry.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "like" })
      });
      setPrompts((curr) => curr.map((p) => (p.id === entry.id ? { ...p, likes: p.likes + 1 } : p)));
    } catch (e) {
      pushError(asFailure(e));
    }
  }

  return (
    <>
      <TopBar user={user} onLogout={() => setUser(null)} />
      <div className="page">
        <div className="plazaHero">
          <div>
            <div className="heroTop" style={{ marginBottom: 14 }}>
              <span className="heroIssue">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-2)" }} />
                Plaza · 02
              </span>
              <span className="heroRule" />
              <span>{prompts.length} prompts on view</span>
            </div>
            <h1 className="plazaH1">
              提示词 <em>广场</em>。<br />
              别人写好的，<em>你一键就能用</em>。
            </h1>
          </div>
          <div>
            <p className="plazaIntro">
              社区策展的可复用提示词集。每张卡片都来自真实生成结果——按一下「复用」便直接落入你的生成控制台。
            </p>
            <div className="rowWrap" style={{ marginTop: 18 }}>
              <button
                className="button buttonAccent"
                onClick={() => {
                  if (!user) router.push("/login");
                  else setShowCreate(true);
                }}
              >
                <Plus size={15} /> 上传我的提示词
              </button>
              <Link href="/" className="button buttonSecondary">
                返回工作台
              </Link>
            </div>
          </div>
        </div>

        <div className="plazaTopBar">
          <div className="plazaFilters">
            <button
              type="button"
              className={`tab ${filter === "all" ? "tabActive" : ""}`}
              onClick={() => setFilter("all")}
              style={{ height: 32, padding: "0 14px" }}
            >
              全部
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${filter === t ? "tabActive" : ""}`}
                onClick={() => setFilter(t)}
                style={{ height: 32, padding: "0 14px" }}
              >
                #{t}
              </button>
            ))}
          </div>
          <span className="mono" style={{ color: "var(--text-muted)" }}>
            {filtered.length} / {prompts.length} entries
          </span>
        </div>

        {filtered.length === 0 && (
          <div
            className="panel"
            style={{ padding: 56, textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 22, color: "var(--text-muted)" }}
          >
            还没有人留下提示词。
            <br />
            做第一个吧。
          </div>
        )}

        <div className="plazaGrid">
          {filtered.map((entry, i) => (
            <article
              key={entry.id}
              className="plazaCard"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <button
                type="button"
                onClick={() => setActive(entry)}
                style={{ display: "block", width: "100%", padding: 0, background: "transparent", textAlign: "left" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="plazaCardImage" src={entry.imageUrl} alt={entry.title} loading="lazy" />
              </button>
              <div className="plazaCardBody">
                <div className="plazaCardTitle">{entry.title}</div>
                <p className="plazaCardPrompt">{entry.prompt}</p>
                <div className="rowWrap" style={{ gap: 4, marginTop: 10 }}>
                  {entry.tags.slice(0, 4).map((t) => (
                    <span key={t} className="tag" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="plazaCardMeta">
                  <span>@{entry.userName}</span>
                  <div className="plazaCardActions">
                    <button
                      type="button"
                      className="iconButtonSm button buttonSecondary"
                      onClick={() => like(entry)}
                      title="收藏"
                      style={{ minHeight: 28, height: 28, width: 28, padding: 0 }}
                    >
                      <Heart size={12} />
                    </button>
                    <button
                      type="button"
                      className="iconButtonSm button buttonAccent"
                      onClick={() => reusePrompt(entry)}
                      title="一键复用"
                      style={{ minHeight: 28, height: 28, width: 28, padding: 0 }}
                    >
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {active && (
          <DetailModal entry={active} onClose={() => setActive(null)} onReuse={() => reusePrompt(active)} onLike={() => like(active)} />
        )}

        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={(entry) => {
              setPrompts((curr) => [entry, ...curr]);
              setShowCreate(false);
            }}
            onError={(e) => pushError(asFailure(e))}
          />
        )}
      </div>
      <ToastDock errors={errors} dismissError={dismissError} />
    </>
  );
}

function DetailModal({ entry, onClose, onReuse, onLike }: { entry: PlazaEntry; onClose: () => void; onReuse: () => void; onLike: () => void }) {
  async function copy() {
    await navigator.clipboard.writeText(entry.prompt);
  }
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(820px, 100%)" }}>
        <div className="modalHeader">
          <div>
            <div className="mono" style={{ color: "var(--text-muted)" }}>@{entry.userName} · {new Date(entry.createdAt).toLocaleDateString("zh-CN")}</div>
            <div className="modalTitle">{entry.title}</div>
          </div>
          <button className="button buttonSecondary iconButton" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modalBody">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.imageUrl} alt={entry.title} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} />
          {entry.model && (
            <div className="mono" style={{ color: "var(--text-muted)" }}>Model · {entry.model}</div>
          )}
          <div className="promptBlock">{entry.prompt}</div>
          <div className="rowWrap">
            {entry.tags.map((t) => (
              <span key={t} className="badge">#{t}</span>
            ))}
          </div>
          <div className="rowWrap">
            <button className="button buttonSecondary" onClick={copy}>
              <Copy size={14} /> 复制
            </button>
            <button className="button buttonSecondary" onClick={onLike}>
              <Heart size={14} /> {entry.likes}
            </button>
            <button className="button buttonAccent" onClick={onReuse} style={{ flex: 1 }}>
              <ArrowUpRight size={15} /> 一键复用到工作台
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
  onError
}: {
  onClose: () => void;
  onCreated: (entry: PlazaEntry) => void;
  onError: (e: unknown) => void;
}) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState("");
  const [model, setModel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickFile() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw data;
      setImageUrl(data.url);
    } catch (err) {
      onError(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiJson<{ entry: PlazaEntry }>("/api/plaza", {
        method: "POST",
        body: JSON.stringify({
          title,
          prompt,
          imageUrl,
          model: model || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
        })
      });
      onCreated(data.entry);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="mono" style={{ color: "var(--text-muted)" }}>New entry</div>
            <div className="modalTitle">分享一个好用的提示词</div>
          </div>
          <button className="button buttonSecondary iconButton" onClick={onClose} type="button"><X size={14} /></button>
        </div>
        <form className="modalBody" onSubmit={submit}>
          <div
            className={`uploadSlot ${imageUrl ? "" : ""}`}
            onClick={pickFile}
            style={{ aspectRatio: "16 / 10" }}
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" />
              </>
            ) : uploading ? (
              <>
                <Loader2 size={18} className="animateSpin" />
                <span className="mono">UPLOADING…</span>
              </>
            ) : (
              <>
                <ImageIcon size={22} />
                <span className="mono">点击上传效果图（≤5MB）</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
          <label className="field">
            <span>标题</span>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：东方未来主义海报" />
          </label>
          <label className="field">
            <span>Prompt</span>
            <textarea className="textarea" required value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="把你最满意的提示词贴在这里" />
          </label>
          <div className="rowWrap" style={{ gap: 14 }}>
            <label className="field" style={{ flex: "1 1 200px" }}>
              <span>标签（逗号分隔）</span>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="海报, 极简, 复古" />
            </label>
            <label className="field" style={{ flex: "1 1 200px" }}>
              <span>使用的模型（可选）</span>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-image-2" />
            </label>
          </div>
          <button className="button buttonAccent" disabled={busy || !imageUrl} type="submit">
            {busy ? <Loader2 size={15} className="animateSpin" /> : <Upload size={15} />}
            发布到广场
          </button>
        </form>
      </div>
    </div>
  );
}
