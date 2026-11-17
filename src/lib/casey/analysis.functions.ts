import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type AnalysisKind,
  type SearchHit,
  FULL_TEXT_BUDGET,
  MAX_QUESTION_CHARS,
  buildTextQuery,
  memoryShortCircuit,
  relevantHistory,
  selectEvidence,
} from "./text";

export type AnswerSource = {
  label: string;
  documentId: string;
  name: string;
  where: string;
  excerpt: string;
  isDemo: boolean;
};

export type AnalysisResult = {
  answer: string;
  sources: AnswerSource[];
  historyUsed: number;
  shortCircuited: boolean;
};

const KINDS: AnalysisKind[] = ["analysis", "memory", "thesis"];

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: AnalysisKind; question: string; documentIds?: string[] }) => {
    if (!KINDS.includes(input.kind)) throw new Error("Tipo de análise inválido.");
    const question = String(input.question || "").trim();
    if (!question) throw new Error("Escreva sua pergunta, os fatos ou a tese.");
    if (question.length > MAX_QUESTION_CHARS) throw new Error("Texto muito longo (máximo 12 mil caracteres).");
    const documentIds = Array.isArray(input.documentIds) ? input.documentIds.filter((x) => typeof x === "string").slice(0, 30) : [];
    return { kind: input.kind, question, documentIds };
  })
  .handler(async ({ data, context }): Promise<AnalysisResult> => {
    const { supabase, userId } = context;
    const ai = await import("./ai.server");
    const { SYSTEM_PROMPTS, buildUserInput } = await import("./prompts");
    try {
      const evidence: { label: string; name: string; isDemo: boolean; where: string; body: string; documentId: string }[] = [];
      const useSelected = data.kind !== "memory" && data.documentIds.length > 0;

      let fullTextDone = false;
      if (useSelected) {
        const { data: docs, error } = await supabase
          .from("documents")
          .select("id,name,is_demo,body,char_count")
          .in("id", data.documentIds);
        if (error) throw new Error(error.message);
        const total = (docs ?? []).reduce((n, d) => n + d.char_count, 0);
        if (docs && docs.length && total <= FULL_TEXT_BUDGET) {
          docs.forEach((d, i) =>
            evidence.push({ label: `FONTE ${i + 1}`, name: d.name, isDemo: d.is_demo, where: "documento completo", body: d.body, documentId: d.id }),
          );
          fullTextDone = true;
        }
      }

      if (!fullTextDone) {
        const qVec = (await ai.embedTexts([data.question]))[0] ?? [];
        const { data: rows, error } = await supabase.rpc("casey_search_chunks", {
          query_text: buildTextQuery(data.question),
          query_embedding: ai.toVectorLiteral(qVec),
          match_count: 16,
          ...(useSelected ? { filter_document_ids: data.documentIds } : {}),
        });
        if (error) throw new Error("Falha na pesquisa documental: " + error.message);
        selectEvidence((rows ?? []) as SearchHit[], 12).forEach((h, i) =>
          evidence.push({
            label: `FONTE ${i + 1}`,
            name: h.document_name,
            isDemo: h.is_demo,
            where: `trecho ${h.chunk_no}`,
            body: h.body,
            documentId: h.document_id,
          }),
        );
      }

      let history: { created_at: string; kind: string; question: string; answer: string }[] = [];
      if (data.kind === "memory") {
        const { data: hist } = await supabase
          .from("analysis_history")
          .select("created_at,kind,question,answer")
          .in("kind", ["analysis", "thesis"])
          .order("created_at", { ascending: false })
          .limit(40);
        history = relevantHistory(data.question, hist ?? [], 6);
      }

      const sources: AnswerSource[] = evidence.map((e) => ({
        label: e.label,
        documentId: e.documentId,
        name: e.name,
        where: e.where,
        excerpt: e.body.slice(0, 700),
        isDemo: e.isDemo,
      }));

      const fixed = data.kind === "memory" ? memoryShortCircuit(evidence.length, history.length) : null;
      const answer =
        fixed ??
        (await ai.generateAnswer(
          SYSTEM_PROMPTS[data.kind],
          buildUserInput({ kind: data.kind, question: data.question, evidence, history }),
          data.kind === "memory" ? "low" : "medium",
        ));

      await supabase.from("analysis_history").insert({
        owner_id: userId,
        kind: data.kind,
        question: data.question,
        answer,
        sources: sources.map(({ excerpt: _e, ...s }) => s),
      });

      return { answer, sources, historyUsed: history.length, shortCircuited: Boolean(fixed) };
    } catch (e) {
      throw new Error(ai.friendlyAiError(e));
    }
  });

export const searchLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const query = String(input.query || "").trim().slice(0, 500);
    if (!query) throw new Error("Digite o que deseja pesquisar.");
    return { query };
  })
  .handler(async ({ data, context }) => {
    const ai = await import("./ai.server");
    try {
      const qVec = (await ai.embedTexts([data.query]))[0] ?? [];
      const { data: rows, error } = await context.supabase.rpc("casey_search_chunks", {
        query_text: buildTextQuery(data.query),
        query_embedding: ai.toVectorLiteral(qVec),
        match_count: 20,
      });
      if (error) throw new Error(error.message);
      return selectEvidence((rows ?? []) as SearchHit[], 15).map((h) => ({
        documentId: h.document_id,
        name: h.document_name,
        chunkNo: h.chunk_no,
        isDemo: h.is_demo,
        excerpt: h.body.slice(0, 900),
        lexical: h.text_rank > 0,
        similarity: Math.round(h.similarity * 100) / 100,
      }));
    } catch (e) {
      throw new Error(ai.friendlyAiError(e));
    }
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: AnalysisKind }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("analysis_history")
      .select("id,kind,question,answer,sources,created_at")
      .eq("kind", data.kind)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
