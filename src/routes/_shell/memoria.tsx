import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnswerPanel } from "@/components/casey/AnswerPanel";
import { HistoryList } from "@/components/casey/HistoryList";
import { useAnalysis } from "@/components/casey/useAnalysis";

export const Route = createFileRoute("/_shell/memoria")({
  head: () => ({
    meta: [
      { title: "Memória da banca — CASEY VERUM" },
      { name: "description", content: "Pergunte o que a banca já registrou: casos, argumentos e estratégias, com fontes." },
      { property: "og:title", content: "Memória da banca — CASEY VERUM" },
      { property: "og:description", content: "Consulte casos e documentos já registrados pela banca." },
    ],
  }),
  component: Memoria,
});

function Memoria() {
  const [q, setQ] = useState("");
  const a = useAnalysis("memory");
  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">03 / HISTÓRICO E APRENDIZADO</div>
          <h1>Memória da banca</h1>
          <p>Consulte o que os documentos registram sobre casos, argumentos, fundamentos e estratégias.</p>
        </div>
      </div>
      <div className="card">
        <h3>Converse com o acervo</h3>
        <textarea
          className="field"
          aria-label="Pergunta à memória da banca"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: Já trabalhamos com algum caso de Direito Tributário? Já tivemos uma situação em que a outra parte alegou falta de cooperação?"
        />
        <div className="actions">
          <button type="button" className="btn primary" disabled={a.loading || !q.trim()} onClick={() => a.run(q)}>
            Consultar memória
          </button>
          <span className="small muted">A resposta usa apenas o acervo e o histórico da conta, e cita as fontes encontradas.</span>
        </div>
        <AnswerPanel title="MEMÓRIA DA BANCA" loading={a.loading} loadingText="Pesquisando o acervo e o histórico da banca..." error={a.error} result={a.result} />
      </div>
      <HistoryList kind="memory" />
    </section>
  );
}
