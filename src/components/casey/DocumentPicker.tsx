import { useQuery } from "@tanstack/react-query";
import { documentsQuery } from "@/lib/casey/queries";
import { UploadDrop } from "./UploadDrop";

export function DocumentPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const docs = useQuery(documentsQuery());
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div style={{ marginTop: 14 }}>
      <div className="small muted" style={{ marginBottom: 8 }}>
        DOCUMENTOS DO CASO · {selected.length ? `${selected.length} selecionado(s): a análise usará apenas esses documentos` : "nenhum selecionado: a Casey pesquisa em todo o acervo"}
      </div>
      <div className="list" style={{ maxHeight: 240, overflow: "auto" }}>
        {(docs.data ?? []).map((d) => (
          <div
            key={d.id}
            role="checkbox"
            aria-checked={selected.includes(d.id)}
            tabIndex={0}
            className={"docrow selectable" + (selected.includes(d.id) ? " selected" : "")}
            onClick={() => toggle(d.id)}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(d.id))}
          >
            <div className="fileicon">{d.file_type}</div>
            <div className="meta">
              <strong>{d.name}</strong>
              <small>{d.is_demo ? "Documento de demonstração" : "Arquivo enviado"}</small>
            </div>
            <span className="tag">{selected.includes(d.id) ? "Incluído" : "Incluir"}</span>
          </div>
        ))}
        {docs.data && !docs.data.length && <div className="empty">A biblioteca está vazia. Anexe os documentos do caso abaixo.</div>}
      </div>
      <div style={{ marginTop: 10 }}>
        <UploadDrop compact onUploaded={(ids) => onChange([...new Set([...selected, ...ids])])} />
      </div>
    </div>
  );
}
