import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AnalysisResult, AnswerSource } from "@/lib/casey/analysis.functions";

export function AnswerPanel({
  title,
  loading,
  loadingText,
  error,
  result,
}: {
  title: string;
  loading: boolean;
  loadingText: string;
  error: string | null;
  result: AnalysisResult | null;
}) {
  if (loading)
    return (
      <div className="source loading-line" style={{ marginTop: 18 }}>
        <span className="spinner" /> {loadingText}
      </div>
    );
  if (error)
    return (
      <div className="source error" style={{ marginTop: 18 }}>
        <b>Não foi possível concluir.</b>
        <br />
        {error}
      </div>
    );
  if (!result) return null;
  const citedLabels = new Set([...result.answer.matchAll(/FONTE (\d+)/g)].map((m) => `FONTE ${m[1]}`));
  const cited = result.sources.filter((x) => citedLabels.has(x.label));
  const others = result.sources.filter((x) => !citedLabels.has(x.label));
  return (
    <div style={{ marginTop: 18 }} data-testid="answer">
      <div className="eyebrow" style={{ margin: "16px 0 8px" }}>
        {title}
      </div>
      <div className="answer">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
      </div>
      {result.sources.length ? (
        <>
          <h3 style={{ margin: "20px 0 8px" }}>
            Fontes citadas · {cited.length}
          </h3>
          {cited.map((src) => (
            <SourceItem key={src.label} s={src} />
          ))}
          {!cited.length && <div className="source">A resposta não citou nenhum trecho específico do acervo.</div>}
          {others.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="small muted" style={{ cursor: "pointer" }}>
                Outros trechos consultados · {others.length}
              </summary>
              {others.map((src) => (
                <SourceItem key={src.label} s={src} />
              ))}
            </details>
          )}
        </>
      ) : (
        <div className="source">
          Nenhuma fonte documental correspondente foi encontrada no acervo. Não considere a resposta comprovação de experiência
          prévia.
        </div>
      )}
      {result.historyUsed > 0 && (
        <p className="small muted">{result.historyUsed} consulta(s) anterior(es) relacionada(s) também foram consideradas.</p>
      )}
    </div>
  );
}

function SourceItem({ s }: { s: AnswerSource }) {
  return (
    <div className="source">
      <b>
        [{s.label}] {s.name}
      </b>{" "}
      · {s.where} {s.isDemo ? "· demonstração" : ""}
      <br />
      {s.excerpt}
      {s.excerpt.length >= 700 ? "…" : ""}
    </div>
  );
}
