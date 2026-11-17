import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getDocumentText } from "@/lib/casey/documents.functions";

export function DocumentViewer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const doc = useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocumentText({ data: { id: id! } }),
    enabled: !!id,
  });
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-base">{doc.data?.name ?? "Carregando..."}</DialogTitle>
        </DialogHeader>
        <div className="doc-viewer">{doc.isLoading ? "Carregando texto..." : (doc.data?.body ?? "")}</div>
      </DialogContent>
    </Dialog>
  );
}
