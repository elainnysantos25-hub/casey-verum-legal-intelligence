import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AnalysisResult } from "@/lib/casey/analysis.functions";

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
          <h3 style={{ margin: "20px 0 8px" }}>Fontes recuperadas · {result.sources.length}</h3>
          {result.sources.map((s) => (
            <div className="source" key={s.label}>
              <b>
                [{s.label}] {s.name}
              </b>{" "}
              · {s.where} {s.isDemo ? "· demonstração" : ""}
              <br />
              {s.excerpt}
              {s.excerpt.length >= 700 ? "…" : ""}
            </div>
          ))}
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
