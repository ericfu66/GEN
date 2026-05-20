"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { apiJson, createRequestId, type ApiFailure } from "@/lib/client/api";
import { ToastDock } from "../components/ToastDock";
import { ThemeToggle } from "../components/ThemeToggle";

type AuthForm = { email: string; password: string; name: string };

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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState<AuthForm>({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ApiFailure[]>([]);

  function dismissError(id: string) {
    setErrors((curr) => curr.filter((e) => e.requestId !== id));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      await apiJson(path, { method: "POST", body: JSON.stringify(form) });
      router.push("/");
    } catch (error) {
      setErrors((curr) => [asFailure(error), ...curr].slice(0, 4));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginArt">
        <div className="loginIssue">
          <span>QY GEN — Vol. 02 / 2026</span>
          <span style={{ position: "relative", zIndex: 2, marginLeft: 18 }}>An Atelier for Media Models</span>
        </div>

        <h1 className="loginHeadline">
          <span>
            Make,
            <br />
            <em>imagine,</em>
            <br />
            <span className="loginUnderline">compose</span>
            <br />
            in plain words.
          </span>
        </h1>

        <div className="loginPoints">
          <div>
            <b>BYOK · Multi-tenant</b>
            Plug your own provider key, isolated per workspace.
          </div>
          <div>
            <b>One canvas</b>
            Text-to-image, text-to-video, vision-to-prompt — one workspace.
          </div>
          <div>
            <b>Plaza, communal</b>
            Share prompts that worked; reuse with one click.
          </div>
          <div>
            <b>LLM copilot</b>
            Pick any chat model, route through any endpoint you trust.
          </div>
        </div>

        <div className="loginFooter">
          <span>Est. 2026 / Shenzhen</span>
          <span>Issue 02 — May</span>
        </div>
      </section>

      <section className="loginForm">
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <ThemeToggle />
        </div>
        <div className="loginInner">
          <div className="loginTitle">
            {mode === "login" ? "Sign in" : "Open an account"}
          </div>
          <h2 className="loginH1">
            {mode === "login" ? (
              <>
                Welcome <em>back</em>.
              </>
            ) : (
              <>
                A new <em>workspace</em>.
              </>
            )}
          </h2>
          <p className="loginSub">
            {mode === "login"
              ? "把你的 API Key 接进来，所有生成只属于你的工作台。"
              : "注册即开通独立工作台、独立配置、独立历史。"}
          </p>

          <div className="loginToggle">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>

          <form className="loginFields" onSubmit={submit}>
            {mode === "register" && (
              <label className="field">
                <span>昵称</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="你的名字"
                />
              </label>
            )}
            <label className="field">
              <span>邮箱</span>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <span>密码</span>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="至少 6 位字符"
              />
            </label>
            <button className="button buttonAccent loginButton" disabled={busy}>
              {busy ? <Loader2 size={16} className="animateSpin" /> : <ArrowRight size={16} />}
              {mode === "login" ? "进入工作台" : "创建并进入"}
            </button>
          </form>

          <div className="loginMeta">
            <span>End-to-end encrypted session</span>
            <span>v0.2</span>
          </div>
        </div>
      </section>

      <ToastDock errors={errors} dismissError={dismissError} />
    </main>
  );
}
