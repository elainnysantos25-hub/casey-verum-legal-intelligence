import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { overviewQuery } from "@/lib/casey/queries";
import { exportLibrary, loadDemoDocuments } from "@/lib/casey/documents.functions";

export const Route = createFileRoute("/_authenticated/_shell/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — CASEY VERUM" },
      { name: "description", content: "Armazenamento, integrações de IA e conta da CASEY VERUM." },
      { property: "og:title", content: "Configurações — CASEY VERUM" },
      { property: "og:description", content: "Armazenamento e integrações da CASEY VERUM." },
    ],
  }),
  component: Config,
});

function Config() {
  const overview = useQuery(overviewQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function doExport() {
    try {
      const data = await exportLibrary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "casey-acervo-backup.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function resetDemo() {
    if (!confirm("Isso recarrega os quatro documentos fictícios de demonstração (seus outros arquivos são mantidos). Continuar?")) return;
    setBusy(true);
    try {
      await loadDemoDocuments();
      toast.success("Documentos de demonstração restaurados.");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">AMBIENTE E DADOS</div>
          <h1>Configurações</h1>
          <p>Armazenamento, integrações e conta.</p>
        </div>
      </div>
      <div className="two">
        <div className="card">
          <h3>Armazenamento</h3>
          <p>Os documentos e o histórico ficam no banco de dados da plataforma, protegidos por login. Cada conta acessa apenas o próprio acervo.</p>
          <div className="metric">{overview.data?.documents ?? "—"}</div>
          <div className="small muted">documentos indexados</div>
          <div className="actions">
            <button type="button" className="btn" onClick={doExport}>Exportar cópia dos dados</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={resetDemo}>
              {busy ? "Restaurando..." : "Restaurar documentos de demonstração"}
            </button>
          </div>
        </div>
        <div className="card">
          <h3>Integração de IA generativa</h3>
          <p>
            As análises são geradas por um modelo de linguagem avançado no servidor, com busca por palavras e por significado no acervo.
            Verifique sempre os fundamentos legais e os documentos citados.
          </p>
          <div className="pill">{overview.data?.aiReady ? "IA conectada" : "IA pendente"}</div>
          <div className="pill">Banco de dados por usuário</div>
          <div className="pill">Fontes rastreáveis</div>
          <p className="small muted">A pesquisa externa de legislação e jurisprudência não está conectada. O modelo não deve afirmar que verificou fontes oficiais.</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Conta</h3>
        <p>Conectado como {overview.data?.email ?? "..."}</p>
        <div className="actions">
          <button type="button" className="btn" onClick={signOut}>Sair</button>
        </div>
      </div>
    </section>
  );
}
