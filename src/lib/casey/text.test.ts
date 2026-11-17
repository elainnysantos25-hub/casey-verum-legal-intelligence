import { describe, expect, it } from "vitest";
import {
  MEMORY_NOT_FOUND,
  buildTextQuery,
  isAcceptedFile,
  memoryShortCircuit,
  selectEvidence,
  splitText,
  tokenize,
  type SearchHit,
} from "./text";

const hit = (id: number, text_rank: number, similarity: number): SearchHit => ({
  chunk_id: id,
  document_id: "d" + id,
  document_name: "doc" + id,
  is_demo: false,
  chunk_no: 1,
  body: "x",
  text_rank,
  similarity,
});

describe("CASEY rules", () => {
  it("accepts only PDF, DOCX and TXT uploads", () => {
    expect(isAcceptedFile("contrato.PDF")).toBe(true);
    expect(isAcceptedFile("nota.docx")).toBe(true);
    expect(isAcceptedFile("fatos.txt")).toBe(true);
    expect(isAcceptedFile("planilha.xlsx")).toBe(false);
    expect(isAcceptedFile("antigo.doc")).toBe(false);
  });

  it("memory answers 'not found' without calling the AI when nothing matches", () => {
    expect(memoryShortCircuit(0, 0)).toBe(MEMORY_NOT_FOUND);
    expect(memoryShortCircuit(1, 0)).toBeNull();
    expect(memoryShortCircuit(0, 2)).toBeNull();
  });

  it("drops semantic matches below the similarity threshold", () => {
    const out = selectEvidence([hit(1, 0, 0.4), hit(2, 0.3, 0.4), hit(3, 0, 0.8)], 12, 0.62);
    expect(out.map((h) => h.chunk_id).sort()).toEqual([2, 3]);
  });

  it("never returns more evidence than the limit", () => {
    const many = Array.from({ length: 30 }, (_, i) => hit(i, 0.1, 0.9));
    expect(selectEvidence(many, 12)).toHaveLength(12);
  });

  it("ignores filler words so 'já trabalhamos' does not match 'plano de trabalho'", () => {
    expect(tokenize("Já trabalhamos com algum caso de Direito Tributário?")).toEqual(["tributario"]);
    expect(buildTextQuery("multa e rescisão")).toBe("multa or rescisao");
  });

  it("splits long documents into chunks of at most 1800 characters", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Parágrafo ${i} ` + "a".repeat(150)).join("\n");
    const chunks = splitText(text);
    expect(chunks.length).toBeGreaterThan(3);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(1800);
  });
});
