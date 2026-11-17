import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/logo-casey.jpeg.asset.json";

type Search = { redirect?: string | undefined };

function safePath(p: string | undefined): string {
  if (!p) return "/painel";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/painel";
    return u.pathname + u.search || "/painel";
  } catch {
    return "/painel";
  }
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({ redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: safePath(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Entrar — CASEY VERUM" },
      { name: "description", content: "Acesse a plataforma jurídica CASEY VERUM." },
      { property: "og:title", content: "Entrar — CASEY VERUM" },
      { property: "og:description", content: "Acesse a plataforma jurídica CASEY VERUM." },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ href: safePath(search.redirect), replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/painel", replace: true });
        else setNotice("Conta criada. Enviamos um link de confirmação para o seu e-mail — confirme para entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setNotice("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        /invalid login/i.test(msg) ? "E-mail ou senha incorretos." : /not confirmed/i.test(msg) ? "Confirme seu e-mail antes de entrar." : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("Não foi possível entrar: " + (result.error.message ?? String(result.error)));
      return;
    }
    if (result.redirected) return;
    navigate({ href: safePath(search.redirect), replace: true });
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <img className="auth-logo" src={logo.url} alt="Logo CASEY" />
        <div className="eyebrow" style={{ textAlign: "center" }}>VERUM · INTELIGÊNCIA JURÍDICA</div>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Entrar</button>
          <button type="button" role="tab" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Criar conta</button>
        </div>
        <form onSubmit={submit} className="list">
          <input className="field" type="email" required autoComplete="email" placeholder="E-mail" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <input
              className="field"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Senha (mínimo 8 caracteres)"
              aria-label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button className="btn primary" disabled={busy} style={{ padding: "12px 16px" }}>
            {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de redefinição"}
          </button>
        </form>
        {notice && <div className="source" style={{ marginTop: 12 }}>{notice}</div>}
        <div className="small" style={{ marginTop: 10, textAlign: "center" }}>
          {mode === "forgot" ? (
            <button type="button" className="btn ghost sm" onClick={() => setMode("signin")}>Voltar para entrar</button>
          ) : (
            mode === "signin" && <button type="button" className="btn ghost sm" onClick={() => setMode("forgot")}>Esqueci minha senha</button>
          )}
        </div>
        <div className="or">ou</div>
        <div className="list">
          <button type="button" className="btn-google" onClick={() => social("google")}>
            <GoogleLogo /> Continue with Google
          </button>
          <button type="button" className="btn btn-provider" onClick={() => social("lovable")}>
            <LovableMark /> Continue with Lovable
          </button>
        </div>
        <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/">Voltar à página inicial</Link>
        </p>
      </div>
    </div>
  );
}
