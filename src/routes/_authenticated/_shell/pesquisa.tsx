import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { searchLibrary } from "@/lib/casey/analysis.functions";

export const Route = createFileRoute("/_authenticated/_shell/pesquisa")({
  head: () => ({
    meta: [
      { title: "Pesquisa jurídica — CASEY VERUM" },
      { name: "description", content: "Pesquise por palavras e por significado em todo o acervo da banca." },
      { property: "og:title", content: "Pesquisa jurídica — CASEY VERUM" },
      { property: "og:description", content: "Pesquisa documental no acervo da banca." },
    ],
  }),
  component: Pesquisa,
});

type Hit = Awaited<ReturnType<typeof searchLibrary>>[number];

function Pesquisa() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setHits(await searchLibrary({ data: { query: q } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">01 / CONHECIMENTO JURÍDICO</div>
          <h1>Pesquisa jurídica</h1>
          <p>Encontre informações no acervo por palavras e por significado. Pesquisa externa de legislação e jurisprudência não está conectada.</p>
        </div>
      </div>
      <div className="card">
        <h3>Pesquisar no acervo</h3>
        <form className="formrow" onSubmit={run}>
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: multa contratual, prazo de cura, art. 475 do Código Civil" />
          <button className="btn primary" style={{ flex: "none" }} disabled={loading}>{loading ? "Pesquisando..." : "Pesquisar"}</button>
        </form>
        {error && <div className="source error">{error}</div>}
        {hits && (
          hits.length ? (
            <>
              <div className="small muted" style={{ margin: "16px 0 8px" }}>FONTES RECUPERADAS · {hits.length}</div>
              {hits.map((h) => (
                <div className="source" key={h.documentId + h.chunkNo}>
                  <b>{h.name}</b> · trecho {h.chunkNo} · {h.lexical ? "correspondência por palavra" : "correspondência por significado"}
                  {h.isDemo ? " · demonstração" : ""}
                  <br />
                  {h.excerpt}
                </div>
              ))}
            </>
          ) : (
            <div className="empty">Não localizei informação correspondente nos documentos disponíveis. Tente reformular a pergunta ou adicionar outros arquivos.</div>
          )
        )}
      </div>
    </section>
  );
}
