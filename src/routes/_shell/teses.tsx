import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnswerPanel } from "@/components/casey/AnswerPanel";
import { DocumentPicker } from "@/components/casey/DocumentPicker";
import { HistoryList } from "@/components/casey/HistoryList";
import { useAnalysis } from "@/components/casey/useAnalysis";

export const Route = createFileRoute("/_shell/teses")({
  head: () => ({
    meta: [
      { title: "Teste de teses — CASEY VERUM" },
      { name: "description", content: "Avaliação crítica de teses jurídicas: fundamentos, fragilidades, contra-argumentos e melhorias." },
      { property: "og:title", content: "Teste de teses — CASEY VERUM" },
      { property: "og:description", content: "Coloque sua tese à prova contra o acervo documental." },
    ],
  }),
  component: Teses,
});

function Teses() {
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const a = useAnalysis("thesis");
  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">05 / CONFRONTO DE ARGUMENTOS</div>
          <h1>Teste de teses</h1>
          <p>Antes de defender uma ideia, coloque-a à prova contra o conjunto documental.</p>
        </div>
      </div>
      <div className="card">
        <h3>Qual tese você quer testar?</h3>
        <textarea
          className="field"
          aria-label="Tese jurídica"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: A Vértice tem direito à rescisão contratual e à declaração de inexigibilidade da multa..."
        />
        <DocumentPicker selected={docs} onChange={setDocs} />
        <div className="actions">
          <button type="button" className="btn primary" disabled={a.loading || !q.trim()} onClick={() => a.run(q, docs)}>
            Testar tese com o acervo
          </button>
          <span className="small muted">A avaliação pode levar até um minuto.</span>
        </div>
        <AnswerPanel title="TESTE DE TESES" loading={a.loading} loadingText="Confrontando a tese com os documentos e objeções possíveis..." error={a.error} result={a.result} />
      </div>
      <HistoryList kind="thesis" />
    </section>
  );
}
