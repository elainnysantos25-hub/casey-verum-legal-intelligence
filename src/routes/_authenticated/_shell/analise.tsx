import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnswerPanel } from "@/components/casey/AnswerPanel";
import { DocumentPicker } from "@/components/casey/DocumentPicker";
import { HistoryList } from "@/components/casey/HistoryList";
import { useAnalysis } from "@/components/casey/useAnalysis";

export const Route = createFileRoute("/_authenticated/_shell/analise")({
  head: () => ({
    meta: [
      { title: "Análise de casos — CASEY VERUM" },
      { name: "description", content: "Análise jurídica estruturada: questões, fundamentos, argumentos, provas, riscos e estratégias." },
      { property: "og:title", content: "Análise de casos — CASEY VERUM" },
      { property: "og:description", content: "Análise jurídica estruturada com IA e fontes do acervo." },
    ],
  }),
  component: Analise,
});

function Analise() {
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const a = useAnalysis("analysis");
  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">04 / COMPREENSÃO DO CASO</div>
          <h1>Análise de casos</h1>
          <p>Organize fatos, documentos, fundamentos, provas, riscos e estratégias.</p>
        </div>
      </div>
      <div className="card">
        <h3>Descreva o caso ou a questão</h3>
        <textarea
          className="field"
          aria-label="Fatos do caso"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Descreva o caso, os fatos, as partes e a dúvida jurídica que deseja analisar..."
        />
        <DocumentPicker selected={docs} onChange={setDocs} />
        <div className="actions">
          <button type="button" className="btn primary" disabled={a.loading || !q.trim()} onClick={() => a.run(q, docs)}>
            Analisar caso
          </button>
          <span className="small muted">A análise pode levar até um minuto.</span>
        </div>
        <AnswerPanel title="ANÁLISE DE CASOS" loading={a.loading} loadingText="Lendo os documentos e preparando a análise jurídica..." error={a.error} result={a.result} />
      </div>
      <HistoryList kind="analysis" />
    </section>
  );
}
