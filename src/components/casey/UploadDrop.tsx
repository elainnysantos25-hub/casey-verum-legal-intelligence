import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractText } from "@/lib/casey/extract";
import { createUploadUrl, discardUpload, ingestDocument } from "@/lib/casey/documents.functions";
import { fileExtension, isAcceptedFile } from "@/lib/casey/text";

const MAX_BYTES = 25 * 1024 * 1024;

export function UploadDrop({ onUploaded, compact }: { onUploaded?: (ids: string[]) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const qc = useQueryClient();

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const ids: string[] = [];
    for (const f of list) {
      if (!isAcceptedFile(f.name)) {
        toast.error(`${f.name}: formato não suportado. Use PDF, DOCX ou TXT.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: arquivo maior que 25 MB.`);
        continue;
      }
      try {
        setBusy(`Lendo ${f.name}...`);
        const text = await extractText(f);
        if (!text) throw new Error("Não foi possível extrair texto (PDF escaneado sem OCR?).");
        setBusy(`Enviando ${f.name}...`);
        const { path, token } = await createUploadUrl({ data: { name: f.name, size: f.size } });
        const up = await supabase.storage.from("documentos").uploadToSignedUrl(path, token, f, { contentType: f.type || "application/octet-stream" });
        if (up.error) throw new Error("Falha no envio do arquivo: " + up.error.message);
        setBusy(`Indexando ${f.name}...`);
        try {
          const res = await ingestDocument({
            data: { name: f.name, fileType: fileExtension(f.name).toUpperCase(), text, storagePath: path },
          });
          ids.push(res.id);
          toast.success(`${f.name} armazenado e indexado (${res.chunks} trechos).`);
        } catch (e) {
          await discardUpload({ data: { path } }).catch(() => undefined);
          throw e;
        }
      } catch (e) {
        toast.error(`Falha ao processar ${f.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["documents"] }),
      qc.invalidateQueries({ queryKey: ["overview"] }),
    ]);
    if (ids.length) onUploaded?.(ids);
  }

  return (
    <label
      className={"drop" + (over ? " over" : "")}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) void handleFiles(e.dataTransfer.files);
      }}
    >
      {busy ? (
        <div className="loading-line" style={{ justifyContent: "center" }}>
          <span className="spinner" />
          <strong style={{ fontSize: 13 }}>{busy}</strong>
        </div>
      ) : (
        <>
          {!compact && <div className="arrow">⇧</div>}
          <strong style={{ fontSize: 13 }}>Arraste arquivos ou clique para selecionar</strong>
          <p className="small muted">PDF, DOCX e TXT · até 25 MB · armazenados no acervo da banca.</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        disabled={!!busy}
        aria-label="Adicionar arquivos"
        onChange={(e) => e.target.files && void handleFiles(e.target.files)}
      />
    </label>
  );
}
