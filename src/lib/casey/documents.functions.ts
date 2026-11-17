import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MAX_DOCUMENT_CHARS, splitText } from "./text";

type Db = SupabaseClient<Database>;

export type DocumentSummary = {
  id: string;
  name: string;
  file_type: string;
  char_count: number;
  is_demo: boolean;
  storage_path: string | null;
  created_at: string;
};

async function indexDocument(supabase: Db, userId: string, documentId: string, text: string) {
  const { embedTexts, toVectorLiteral } = await import("./ai.server");
  const chunks = splitText(text);
  const vectors = await embedTexts(chunks);
  const rows = chunks.map((body, i) => ({
    document_id: documentId,
    owner_id: userId,
    chunk_no: i + 1,
    body,
    embedding: toVectorLiteral(vectors[i] ?? []),
  }));
  for (let i = 0; i < rows.length; i += 40) {
    const { error } = await supabase.from("document_chunks").insert(rows.slice(i, i + 40));
    if (error) throw new Error("Falha ao indexar o documento: " + error.message);
  }
  return chunks.length;
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DocumentSummary[]> => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id,name,file_type,char_count,is_demo,storage_path,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [docs, hist] = await Promise.all([
      context.supabase.from("documents").select("id", { count: "exact", head: true }),
      context.supabase.from("analysis_history").select("id", { count: "exact", head: true }),
    ]);
    if (docs.error) throw new Error(docs.error.message);
    return {
      documents: docs.count ?? 0,
      analyses: hist.count ?? 0,
      databaseReady: true,
      aiReady: Boolean(process.env["LOVABLE_API_KEY"]),
      email: (context.claims as { email?: string } | undefined)?.email ?? null,
    };
  });

export const getDocumentText = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id,name,file_type,body,is_demo,created_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error("Documento não encontrado.");
    return doc;
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase.from("documents").select("storage_path").eq("id", data.id).single();
    if (error || !doc?.storage_path) throw new Error("Este documento não tem arquivo original armazenado.");
    const { data: signed, error: sErr } = await context.supabase.storage.from("documentos").createSignedUrl(doc.storage_path, 300);
    if (sErr || !signed) throw new Error("Não foi possível gerar o link de download.");
    return { url: signed.signedUrl };
  });

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; fileType: string; text: string; storagePath: string | null }) => {
    const name = String(input.name || "").trim().slice(0, 250);
    const text = String(input.text || "").trim();
    const fileType = String(input.fileType || "TXT").toUpperCase().slice(0, 10);
    if (!name) throw new Error("Nome do arquivo ausente.");
    if (!text) throw new Error("Não foi possível extrair texto deste arquivo (PDF escaneado sem OCR?).");
    if (text.length > MAX_DOCUMENT_CHARS) throw new Error("Documento maior que 400 mil caracteres.");
    return { name, text, fileType, storagePath: input.storagePath ? String(input.storagePath) : null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.storagePath && !data.storagePath.startsWith(userId + "/")) throw new Error("Caminho de arquivo inválido.");
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        owner_id: userId,
        name: data.name,
        file_type: data.fileType,
        body: data.text,
        char_count: data.text.length,
        storage_path: data.storagePath,
      })
      .select("id")
      .single();
    if (error || !doc) throw new Error("Falha ao salvar o documento: " + (error?.message ?? ""));
    try {
      const chunks = await indexDocument(supabase, userId, doc.id, data.text);
      return { id: doc.id, chunks };
    } catch (e) {
      await supabase.from("documents").delete().eq("id", doc.id);
      const { friendlyAiError } = await import("./ai.server");
      throw new Error(friendlyAiError(e));
    }
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from("documents").select("storage_path").eq("id", data.id).single();
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (doc?.storage_path) await context.supabase.storage.from("documentos").remove([doc.storage_path]);
    return { ok: true };
  });

export const loadDemoDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { DEMO_DOCS } = await import("./demo-docs.server");
    const { error: delErr } = await supabase.from("documents").delete().eq("is_demo", true);
    if (delErr) throw new Error(delErr.message);
    for (const d of DEMO_DOCS) {
      const { data: doc, error } = await supabase
        .from("documents")
        .insert({
          owner_id: userId,
          name: d.name,
          file_type: d.type,
          body: d.text,
          char_count: d.text.length,
          is_demo: true,
          demo_key: d.key,
        })
        .select("id")
        .single();
      if (error || !doc) throw new Error(error?.message ?? "Falha ao inserir documento de demonstração.");
      try {
        await indexDocument(supabase, userId, doc.id, d.text);
      } catch (e) {
        await supabase.from("documents").delete().eq("id", doc.id);
        const { friendlyAiError } = await import("./ai.server");
        throw new Error(friendlyAiError(e));
      }
    }
    return { count: DEMO_DOCS.length };
  });

export const exportLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [docs, hist] = await Promise.all([
      context.supabase.from("documents").select("id,name,file_type,is_demo,created_at,body").order("created_at"),
      context.supabase.from("analysis_history").select("kind,question,answer,sources,created_at").order("created_at"),
    ]);
    if (docs.error) throw new Error(docs.error.message);
    return { exported_at: new Date().toISOString(), documents: docs.data ?? [], history: hist.data ?? [] };
  });
