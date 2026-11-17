import { formatInt } from "@/lib/casey/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { documentsQuery, overviewQuery } from "@/lib/casey/queries";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "CASEY VERUM — Inteligência Jurídica" },
      { name: "description", content: "Plataforma jurídica com IA: análise de casos, memória da banca e teste de teses com base no acervo do escritório." },
      { property: "og:title", content: "CASEY VERUM — Inteligência Jurídica" },
      { property: "og:description", content: "O conhecimento da banca. Em movimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(documentsQuery()), context.queryClient.ensureQueryData(overviewQuery())]),
  component: Painel,
});

function Painel() {
  const docs = useQuery(documentsQuery());
  const overview = useQuery(overviewQuery());
  return (
    <section>
      <div className="hero">
        <div className="copy">
          <div className="eyebrow">INTELIGÊNCIA JURÍDICA CONTEXTUAL</div>
          <h1>
            O conhecimento da banca.
            <br />
            <span>Em movimento.</span>
          </h1>
          <p className="sub">
            Uma plataforma para transformar documentos, experiências e estratégias já construídas em ponto de partida para novos casos.
          </p>
          <div className="actions">
            <Link to="/biblioteca" className="btn primary">Acessar biblioteca ↗</Link>
            <Link to="/teses" className="btn">Testar uma tese</Link>
          </div>
        </div>
      </div>
      <div className="grid">
        <div className="card">
          <div className="symbol">▤</div>
          <h3>Biblioteca jurídica</h3>
          <p>Acervo privado, organizado e pesquisável.</p>
          <div className="metric">{overview.data?.documents ?? "—"}</div>
          <div className="small muted">documentos disponíveis</div>
        </div>
        <div className="card">
          <div className="symbol">◈</div>
          <h3>Memória da banca</h3>
          <p>Recupere fatos, argumentos e aprendizados anteriores.</p>
          <div className="metric">{overview.data?.analyses ?? "—"}</div>
          <div className="small muted">consultas registradas no histórico</div>
        </div>
        <div className="card">
          <div className="symbol">⚖</div>
          <h3>Teste de teses</h3>
          <p>Coloque argumentos à prova com fontes rastreáveis.</p>
          <div className="metric">IA + RAG</div>
          <div className="small muted">recuperação de documentos</div>
        </div>
      </div>
      <div className="two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Acervo conectado</h3>
          <p>As consultas recuperam trechos de todos os arquivos relevantes da sua biblioteca.</p>
          <div className="list" style={{ marginTop: 14 }}>
            {(docs.data ?? []).slice(0, 4).map((d) => (
              <div className="docrow" key={d.id}>
                <div className="fileicon">{d.file_type}</div>
                <div className="meta">
                  <strong>{d.name}</strong>
                  <small>{formatInt(d.char_count)} caracteres indexados</small>
                </div>
                <span className="tag">Ativo</span>
              </div>
            ))}
            {docs.data && !docs.data.length && (
              <div className="empty">
                Nenhum documento ainda. <Link to="/biblioteca" className="title-gradient">Adicione arquivos na Biblioteca</Link>.
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <h3>Fluxo de trabalho</h3>
          <p>Da leitura dos documentos à avaliação de estratégias.</p>
          <div className="list" style={{ marginTop: 14 }}>
            {[
              ["01", "Consultar", "Pesquisar no acervo e na memória"],
              ["02", "Compreender", "Organizar fatos e pontos críticos"],
              ["03", "Confrontar", "Testar argumentos e objeções"],
              ["04", "Conferir", "Verificar as fontes utilizadas"],
            ].map(([n, t, s]) => (
              <div className="docrow" key={n}>
                <span className="tag">{n}</span>
                <div className="meta">
                  <strong>{t}</strong>
                  <small>{s}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
