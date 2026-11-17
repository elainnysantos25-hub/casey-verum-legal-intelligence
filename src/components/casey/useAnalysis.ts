import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runAnalysis, type AnalysisResult } from "@/lib/casey/analysis.functions";
import type { AnalysisKind } from "@/lib/casey/text";

export function useAnalysis(kind: AnalysisKind) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function run(question: string, documentIds: string[] = []) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await runAnalysis({ data: { kind, question, documentIds } });
      setResult(r);
      void qc.invalidateQueries({ queryKey: ["history", kind] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  return { loading, error, result, run };
}
