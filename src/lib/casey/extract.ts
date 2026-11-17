// Browser-only text extraction for PDF, DOCX and TXT uploads.
import { fileExtension } from "./text";

export async function extractText(file: File): Promise<string> {
  const ext = fileExtension(file.name);
  if (ext === "txt") return (await file.text()).trim();
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return out.value.trim();
  }
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const line = content.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim();
      pages.push(`[Página ${n}] ${line}`);
    }
    return pages.join("\n").trim();
  }
  throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
}
