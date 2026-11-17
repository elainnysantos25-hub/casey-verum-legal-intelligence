// Server-only: Lovable AI Gateway calls (chat + embeddings).
import { generateEmbeddings, generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

export const CHAT_MODEL = "openai/gpt-6.1-sol" as const;
export const EMBED_MODEL = "google/gemini-embedding-2" as const;
export const EMBED_DIMENSIONS = 768;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64).map((t) => t.slice(0, 8000));
    const res = await generateEmbeddings({ model: EMBED_MODEL, input: batch, dimensions: EMBED_DIMENSIONS });
    for (const row of res.data) out.push(row.embedding as number[]);
  }
  return out;
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export async function generateAnswer(instructions: string, input: string, effort: "low" | "medium"): Promise<string> {
  const res = await generateResponse({
    model: CHAT_MODEL,
    instructions,
    input,
    reasoning: { effort },
    max_output_tokens: 9000,
  });
  const parts: string[] = [];
  for (const item of res.output ?? []) {
    if (item.type === "message") {
      for (const c of item.content ?? []) {
        if (c.type === "output_text") parts.push(c.text);
        if (c.type === "refusal") parts.push(c.refusal);
      }
    }
  }
  const text = parts.join("\n").trim();
  if (!text) throw new Error("O modelo de IA não retornou resposta. Tente novamente.");
  return text;
}

export function friendlyAiError(e: unknown): string {
  if (e instanceof GatewayError) {
    const name = e.constructor.name;
    if (name === "PaymentRequiredError") return "Os créditos de IA do workspace acabaram. Adicione créditos para continuar.";
    if (name === "RateLimitError") return "Muitas solicitações à IA no momento. Aguarde alguns segundos e tente de novo.";
    if (name === "PermissionDeniedError") return "O uso deste modelo de IA não está permitido neste workspace.";
    if (name === "TimeoutError" || name === "NetworkError")
      return "A IA demorou demais para responder. Tente novamente em instantes.";
    return `Falha no serviço de IA (${e.code}).`;
  }
  return e instanceof Error ? e.message : "Erro inesperado.";
}
