import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { documentsQuery } from "@/lib/casey/queries";
import { deleteDocument, getDownloadUrl, loadDemoDocuments } from "@/lib/casey/documents.functions";
import { UploadDrop } from "@/components/casey/UploadDrop";
import { DocumentViewer } from "@/components/casey/DocumentViewer";

export const Route = createFileRoute("/_shell/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca jurídica — CASEY VERUM" },
      { name: "description", content: "Acervo privado de documentos da banca: envie PDF, DOCX e TXT." },
      { property: "og:title", content: "Biblioteca jurídica — CASEY VERUM" },
      { property: "og:description", content: "Acervo privado e pesquisável da banca." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(documentsQuery()),
  component: Biblioteca,
});

function Biblioteca() {
  const docs = useQuery(documentsQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const [busyDemo, setBusyDemo] = useState(false);

  const list = (docs.data ?? []).filter(
    (d) => (type === "all" || d.file_type === type) && (!q || d.name.toLowerCase().includes(q.toLowerCase())),
  );

  async function remove(id: string, name: string) {
    if (!confirm(`Excluir "${name}" do acervo? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteDocument({ data: { id } });
      toast.success("Documento excluído.");
      await qc.invalidateQueries({ queryKey: ["documents"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function download(id: string) {
    try {
      const { url } = await getDownloadUrl({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadDemo() {
    setBusyDemo(true);
    try {
      const r = await loadDemoDocuments();
      toast.success(`${r.count} documentos de demonstração carregados.`);
      await qc.invalidateQueries({ queryKey: ["documents"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyDemo(false);
    }
  }

  return (
    <section>
      <div className="sectionhead">
        <div>
          <div className="eyebrow">02 / ACERVO PRIVADO</div>
          <h1>Biblioteca jurídica</h1>
          <p>Documentos que formam a base de conhecimento da banca.</p>
        </div>
      </div>
      <div className="card">
        <UploadDrop />
        <div className="formrow">
          <input className="field" placeholder="Buscar pelo nome do documento..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field" style={{ maxWidth: 180 }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de arquivo">
            <option value="all">Todos os tipos</option>
            <option>DOCX</option>
            <option>PDF</option>
            <option>TXT</option>
          </select>
        </div>
        <div className="list">
          {list.map((d) => (
            <div className="docrow" key={d.id}>
              <div className="fileicon">{d.file_type}</div>
              <div className="meta">
                <strong>{d.name}</strong>
                <small>
                  {d.char_count.toLocaleString("pt-BR")} caracteres · {d.is_demo ? "Documento de demonstração" : "Arquivo enviado"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("pt-BR")}
                </small>
              </div>
              <button type="button" className="btn sm" onClick={() => setViewing(d.id)}>Ver</button>
              {d.storage_path && (
                <button type="button" className="btn sm" onClick={() => download(d.id)}>Baixar</button>
              )}
              <button type="button" className="btn sm ghost danger" onClick={() => remove(d.id, d.name)}>Excluir</button>
            </div>
          ))}
          {docs.isLoading && <div className="empty">Carregando acervo...</div>}
          {docs.data && !list.length && (
            <div className="empty">
              {docs.data.length ? "Nenhum documento encontrado." : "Sua biblioteca está vazia. Envie arquivos acima"}
              {!docs.data.length && (
                <>
                  {" "}ou{" "}
                  <button type="button" className="btn sm" disabled={busyDemo} onClick={loadDemo}>
                    {busyDemo ? "Carregando..." : "carregue o caso fictício Vértice x Horizonte"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <DocumentViewer id={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
