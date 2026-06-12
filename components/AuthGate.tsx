"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Brain, KeyRound, Sparkles } from "lucide-react";

export default function AuthGate() {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [devCode, setDevCode] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      code: String(form.get("code") ?? "")
    };

    const endpoint = mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : mode;
    const body =
      mode === "login"
        ? { email: payload.email, password: payload.password }
        : mode === "forgot"
          ? { email: payload.email }
          : mode === "reset"
            ? { email: payload.email, code: payload.code, password: payload.password }
            : payload;

    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "操作失败，请稍后重试。");
      return;
    }

    if (mode === "forgot") {
      setResetEmail(payload.email);
      setDevCode(data.devCode ?? "");
      setMessage(data.message ?? "验证码已生成。");
      setMode("reset");
      return;
    }

    if (mode === "reset") {
      setMessage(data.message ?? "密码已重置。");
      setMode("login");
      return;
    }

    window.location.reload();
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand-mark">
          <span className="brand-icon">
            <BookOpen size={24} />
          </span>
          <span>StudyNote AI</span>
        </div>

        <div className="auth-hero">
          <h1>把课堂材料整理成真正能复习的笔记。</h1>
          <p>
            面向大学生的 AI 网页笔记本。上传截图、粘贴文字或输入大纲，内置 AI 会整理为 Markdown、公式、表格、思维导图和闪卡。
          </p>
        </div>

        <div className="feature-strip">
          <div className="feature-pill">
            <strong>课程工作台</strong>
            <span>按学期、课程和 Lecture 管理知识，不让资料散在聊天记录里。</span>
          </div>
          <div className="feature-pill">
            <strong>AI 整理</strong>
            <span>真实模型 API 处理截图、文字和大纲，输出可编辑的结构化笔记。</span>
          </div>
          <div className="feature-pill">
            <strong>复习资产</strong>
            <span>自动生成闪卡、重点总结和思维导图，适合考前快速回看。</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="账号入口">
        <div className="segmented">
          <button
            className={mode === "register" ? "active" : ""}
            disabled={!hydrated}
            onClick={() => { setMode("register"); setError(""); setMessage(""); }}
            type="button"
          >
            注册
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            disabled={!hydrated}
            onClick={() => { setMode("login"); setError(""); setMessage(""); }}
            type="button"
          >
            登录
          </button>
        </div>

        <h2>{getTitle(mode)}</h2>
        <p>{getDescription(mode)}</p>

        <form onSubmit={submit}>
          {mode === "register" ? (
            <label className="field">
              <span>昵称</span>
              <input name="name" placeholder="例如：王若孚" required minLength={2} />
            </label>
          ) : null}
          <label className="field">
            <span>邮箱</span>
            <input name="email" type="email" placeholder="you@example.com" required defaultValue={mode === "reset" ? resetEmail : ""} />
          </label>

          {mode === "reset" ? (
            <label className="field">
              <span>验证码</span>
              <input name="code" inputMode="numeric" placeholder="6 位验证码" required minLength={6} maxLength={6} defaultValue={devCode} />
            </label>
          ) : null}

          {mode !== "forgot" ? (
            <label className="field">
              <span>{mode === "reset" ? "新密码" : "密码"}</span>
              <input name="password" type="password" placeholder="至少 6 位" required minLength={mode === "login" ? 1 : 6} />
            </label>
          ) : null}

          <button className="primary-button" disabled={busy || !hydrated} type="submit">
            {busy ? (
              "处理中..."
            ) : (
              <>
                {mode === "register" ? <Sparkles size={18} /> : mode === "forgot" || mode === "reset" ? <KeyRound size={18} /> : <Brain size={18} />}
                {getSubmitText(mode)}
              </>
            )}
          </button>
          {error ? <div className="error-box">{error}</div> : null}
          {message ? <div className="command-message">{message}</div> : null}
        </form>

        {mode === "login" ? (
          <button className="text-button" disabled={!hydrated} type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>
            忘记密码？
          </button>
        ) : null}

        {mode === "forgot" || mode === "reset" ? (
          <button className="text-button" disabled={!hydrated} type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>
            返回登录
          </button>
        ) : null}

        <p className="small-muted" style={{ marginTop: 18 }}>
          内置 AI 需要在 `.env.local` 配置真实 API Key；账号和笔记数据会按用户隔离保存。
        </p>
      </section>
    </main>
  );
}

function getTitle(mode: "login" | "register" | "forgot" | "reset") {
  if (mode === "register") return "创建学习空间";
  if (mode === "forgot") return "找回密码";
  if (mode === "reset") return "设置新密码";
  return "回到学习空间";
}

function getDescription(mode: "login" | "register" | "forgot" | "reset") {
  if (mode === "register") return "注册后会自动生成一门示例课程，方便你立即体验整理流程。";
  if (mode === "forgot") return "输入注册邮箱，生成一次性验证码。";
  if (mode === "reset") return "验证码 15 分钟内有效。";
  return "继续整理今天的课堂材料。";
}

function getSubmitText(mode: "login" | "register" | "forgot" | "reset") {
  if (mode === "register") return "进入笔记本";
  if (mode === "forgot") return "获取验证码";
  if (mode === "reset") return "重置密码";
  return "登录";
}
