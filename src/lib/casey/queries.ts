import { queryOptions } from "@tanstack/react-query";
import { getOverview, listDocuments } from "./documents.functions";
import { listHistory } from "./analysis.functions";
import type { AnalysisKind } from "./text";

export const documentsQuery = () => queryOptions({ queryKey: ["documents"], queryFn: () => listDocuments() });
export const overviewQuery = () => queryOptions({ queryKey: ["overview"], queryFn: () => getOverview() });
export const historyQuery = (kind: AnalysisKind) =>
  queryOptions({ queryKey: ["history", kind], queryFn: () => listHistory({ data: { kind } }) });
