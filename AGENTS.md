<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (CASEY VERUM)
- The site has no login: all data access goes through server functions in `src/lib/casey/*.functions.ts` using the privileged client from `workspace.server.ts` and one shared workspace id; tables keep RLS with no anon policies so the public key cannot read them directly.
- File uploads use a server-issued signed upload URL (`createUploadUrl`) to the private `documentos` bucket; text is extracted in the browser (mammoth / pdfjs) and indexed server-side.
- Retrieval is hybrid (Portuguese full-text + pgvector embeddings) via the `casey_search_chunks` RPC; evidence selection and the memory "not found" rule live in `src/lib/casey/text.ts` and are covered by `text.test.ts`.
- AI calls use `@lovable.dev/ai-gateway` only inside server handlers (`ai.server.ts`), loaded with dynamic import.
- Router uses `setupRouterSsrQueryIntegration` so loader data hydrates identically; format numbers/dates with `src/lib/casey/format.ts`, not locale APIs, to avoid hydration mismatches.
