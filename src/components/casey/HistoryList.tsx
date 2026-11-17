import { formatDate } from "@/lib/casey/format";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { historyQuery } from "@/lib/casey/queries";
import type { AnalysisKind } from "@/lib/casey/text";

export function HistoryList({ kind }: { kind: AnalysisKind }) {
  const hist = useQuery(historyQuery(kind));
  const [open, setOpen] = useState<string | null>(null);
  if (!hist.data?.length) return null;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Consultas anteriores</h3>
      <p>Registradas automaticamente no histórico da sua conta.</p>
      <div className="list" style={{ marginTop: 12 }}>
        {hist.data.map((h) => (
          <div key={h.id}>
            <button type="button" className="docrow" style={{ width: "100%", textAlign: "left", color: "inherit" }} onClick={() => setOpen(open === h.id ? null : h.id)}>
              <span className="tag">{formatDate(h.created_at)}</span>
              <div className="meta">
                <strong>{h.question.slice(0, 160)}{h.question.length > 160 ? "…" : ""}</strong>
              </div>
              <span className="small muted">{open === h.id ? "Fechar" : "Ver"}</span>
            </button>
            {open === h.id && (
              <div className="answer" style={{ padding: "8px 12px" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.answer}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
