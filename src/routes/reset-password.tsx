import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — CASEY VERUM" },
      { name: "description", content: "Defina uma nova senha para sua conta CASEY VERUM." },
      { property: "og:title", content: "Redefinir senha — CASEY VERUM" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h2>Redefinir senha</h2>
        {ready ? (
          <form onSubmit={submit} className="list" style={{ marginTop: 16 }}>
            <input className="field" type="password" required minLength={8} placeholder="Nova senha" aria-label="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn primary" disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        ) : (
          <p>Abra esta página pelo link enviado ao seu e-mail.</p>
        )}
      </div>
    </div>
  );
}
