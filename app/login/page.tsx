"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("云端配置尚未完成，请先配置 Supabase 环境变量。");
      return;
    }
    if (!email.trim()) {
      setError("请输入邮箱地址。");
      return;
    }

    setBusy(true);
    const redirectTo = new URL("/auth/callback?next=/", window.location.origin).toString();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="shell" style={{ maxWidth: 520 }}>
      <a href="/" className="muted">← 返回首页</a>
      <section className="hero" style={{ marginTop: 20 }}>
        <div className="brand">🌱 BabyCare</div>
        <h1>登录家庭空间</h1>
        <p className="muted">使用邮箱接收安全登录链接，无需设置密码。</p>
      </section>
      <section className="panel">
        <label className="muted">邮箱地址</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          style={{ width: "100%", padding: 12, border: "1px solid #dce6df", borderRadius: 10, margin: "8px 0 14px" }}
        />
        <button className="primary" disabled={busy} onClick={send}>
          {busy ? "发送中…" : "发送登录链接"}
        </button>
        {sent && <p style={{ color: "#287653" }}>登录链接已发送，请使用最新收到的邮件链接，并尽快打开（包括检查垃圾邮件文件夹）。</p>}
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
      </section>
      <p className="notice">请勿将 service_role 或 secret key 放入浏览器。</p>
    </main>
  );
}
