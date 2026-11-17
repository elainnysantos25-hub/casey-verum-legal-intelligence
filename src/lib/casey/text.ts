// Pure helpers for chunking, query building and evidence selection.
// Shared by server functions and tests; no I/O here.

export type AnalysisKind = "analysis" | "memory" | "thesis";

export const KIND_LABEL: Record<AnalysisKind, string> = {
  analysis: "Análise de casos",
  memory: "Memória da banca",
  thesis: "Teste de teses",
};

const STOPWORDS = new Set([
  "que", "para", "como", "uma", "com", "dos", "das", "por", "qual", "quais", "tem", "temos", "sobre",
  "este", "esta", "esse", "essa", "isso", "isto", "caso", "casos", "tese", "direito", "banca", "algum",
  "alguma", "alguns", "algumas", "trabalhei", "trabalhamos", "trabalhou", "trabalharam", "houve", "fazer",
  "tivemos", "teve", "atuamos", "atuou", "existe", "existem", "registro", "registros", "escritorio",
  "nos", "nossa", "nosso", "ser", "foi", "sao", "seja", "the", "and", "pela", "pelo", "nas", "nos",
  "mais", "muito", "quando", "onde", "entre", "ainda", "voce", "pode", "podem", "deve", "devem", "seu", "sua",
  "acervo", "documento", "documentos", "ja", "jah",
]);

export function normalize(s: string): string {
  return (s || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Distinct meaningful terms (3+ chars, no stopwords), accent-insensitive. */
export function tokenize(s: string): string[] {
  const terms = normalize(s).match(/[a-z0-9]{3,}/g) || [];
  return [...new Set(terms)].filter((t) => !STOPWORDS.has(t));
}

/** Full-text query in web-search syntax: any term may match ("a or b or c"). */
export function buildTextQuery(question: string): string {
  return tokenize(question).slice(0, 24).join(" or ");
}

/** Splits text into ~maxLen chunks, preferring paragraph breaks after minLen. */
export function splitText(text: string, maxLen = 1800, minLen = 900): string[] {
  const s = (text || "").replace(/\r\n/g, "\n").trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < s.length) {
    let end = Math.min(s.length, i + maxLen);
    if (end < s.length) {
      const br = s.lastIndexOf("\n", end);
      if (br > i + minLen) end = br;
      else {
        const sp = s.lastIndexOf(" ", end);
        if (sp > i + minLen) end = sp;
      }
    }
    const piece = s.slice(i, end).trim();
    if (piece) chunks.push(piece);
    i = end;
  }
  return chunks;
}

export type SearchHit = {
  chunk_id: number;
  document_id: string;
  document_name: string;
  is_demo: boolean;
  chunk_no: number;
  body: string;
  text_rank: number;
  similarity: number;
};

/** Semantic matches below this cosine similarity count as unrelated. */
export const MIN_SIMILARITY = 0.62;

/**
 * Keeps hits that match by words (text_rank > 0) or by meaning (similarity >= min),
 * ranked by reciprocal-rank fusion of both orderings.
 */
export function selectEvidence(hits: SearchHit[], limit = 12, minSimilarity = MIN_SIMILARITY): SearchHit[] {
  const relevant = hits.filter((h) => h.text_rank > 0 || h.similarity >= minSimilarity);
  const byText = [...relevant].filter((h) => h.text_rank > 0).sort((a, b) => b.text_rank - a.text_rank);
  const bySim = [...relevant].sort((a, b) => b.similarity - a.similarity);
  const score = new Map<number, number>();
  byText.forEach((h, i) => score.set(h.chunk_id, (score.get(h.chunk_id) || 0) + 1 / (60 + i)));
  bySim.forEach((h, i) => {
    if (h.similarity >= minSimilarity) score.set(h.chunk_id, (score.get(h.chunk_id) || 0) + 1 / (60 + i));
  });
  return relevant
    .sort((a, b) => (score.get(b.chunk_id) || 0) - (score.get(a.chunk_id) || 0))
    .slice(0, limit);
}

export const MEMORY_NOT_FOUND =
  "Não encontrei registro no acervo consultado que comprove experiência anterior nesse assunto.";

/** Memória da banca never asks the model when there is no evidence at all. */
export function memoryShortCircuit(evidenceCount: number, historyCount: number): string | null {
  return evidenceCount === 0 && historyCount === 0 ? MEMORY_NOT_FOUND : null;
}

/** Previous analyses that share at least one meaningful term with the question. */
export function relevantHistory<T extends { question: string; answer: string }>(
  question: string,
  rows: T[],
  limit = 6,
): T[] {
  const terms = tokenize(question);
  if (!terms.length) return [];
  return rows
    .map((r) => {
      const hay = normalize(r.question + " " + r.answer);
      return { r, n: terms.filter((t) => hay.includes(t)).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((x) => x.r);
}

export const MAX_DOCUMENT_CHARS = 400_000;
export const MAX_QUESTION_CHARS = 12_000;
/** Selected documents up to this total size are sent whole instead of as excerpts. */
export const FULL_TEXT_BUDGET = 90_000;

export const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt"] as const;
export function fileExtension(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}
export function isAcceptedFile(name: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}
