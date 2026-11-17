CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.casey_unaccent(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = ''
AS $$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, input) $$;

-- Documentos da biblioteca
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  file_type text NOT NULL DEFAULT 'TXT',
  storage_path text,
  body text NOT NULL,
  char_count integer NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  demo_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX documents_owner_idx ON public.documents(owner_id, created_at DESC);

-- Trechos indexados (texto completo + vetor)
CREATE TABLE public.document_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  chunk_no integer NOT NULL,
  body text NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese'::regconfig, public.casey_unaccent(body))) STORED,
  embedding extensions.vector(768),
  UNIQUE (document_id, chunk_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks_select_own" ON public.document_chunks FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "chunks_insert_own" ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid())
);
CREATE POLICY "chunks_update_own" ON public.document_chunks FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "chunks_delete_own" ON public.document_chunks FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX document_chunks_tsv_idx ON public.document_chunks USING gin(tsv);
CREATE INDEX document_chunks_owner_idx ON public.document_chunks(owner_id);
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING hnsw (embedding extensions.vector_cosine_ops);

-- Histórico das análises
CREATE TABLE public.analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('analysis','memory','thesis')),
  question text NOT NULL,
  answer text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.analysis_history TO authenticated;
GRANT ALL ON public.analysis_history TO service_role;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select_own" ON public.analysis_history FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "history_insert_own" ON public.analysis_history FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "history_delete_own" ON public.analysis_history FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX analysis_history_owner_idx ON public.analysis_history(owner_id, created_at DESC);

-- Busca híbrida (RLS do usuário se aplica: SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.casey_search_chunks(
  query_text text,
  query_embedding text,
  match_count integer DEFAULT 12,
  filter_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id bigint,
  document_id uuid,
  document_name text,
  is_demo boolean,
  chunk_no integer,
  body text,
  text_rank real,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT CASE WHEN coalesce(trim(query_text), '') = '' THEN NULL
                ELSE websearch_to_tsquery('portuguese'::regconfig, public.casey_unaccent(query_text)) END AS tsq,
           CASE WHEN query_embedding IS NULL THEN NULL ELSE query_embedding::extensions.vector(768) END AS emb
  ),
  lexical AS (
    SELECT c.id, ts_rank_cd(c.tsv, q.tsq) AS rnk
    FROM public.document_chunks c, q
    WHERE q.tsq IS NOT NULL AND c.tsv @@ q.tsq
      AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    ORDER BY rnk DESC
    LIMIT greatest(match_count, 1) * 2
  ),
  semantic AS (
    SELECT c.id, 1 - (c.embedding <=> q.emb) AS sim
    FROM public.document_chunks c, q
    WHERE q.emb IS NOT NULL AND c.embedding IS NOT NULL
      AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    ORDER BY c.embedding <=> q.emb
    LIMIT greatest(match_count, 1) * 2
  ),
  ids AS (SELECT id FROM lexical UNION SELECT id FROM semantic)
  SELECT c.id, c.document_id, d.name, d.is_demo, c.chunk_no, c.body,
         coalesce(l.rnk, 0)::real,
         coalesce(s.sim, CASE WHEN q.emb IS NOT NULL AND c.embedding IS NOT NULL THEN 1 - (c.embedding <=> q.emb) END, 0)
  FROM ids
  JOIN public.document_chunks c ON c.id = ids.id
  JOIN public.documents d ON d.id = c.document_id
  CROSS JOIN q
  LEFT JOIN lexical l ON l.id = c.id
  LEFT JOIN semantic s ON s.id = c.id;
$$;
GRANT EXECUTE ON FUNCTION public.casey_search_chunks(text, text, integer, uuid[]) TO authenticated;