-- =========================================================
--  Heráclito — Biblioteca ↔ Google Drive (sincronização)
--  Adiciona:
--   1. Tabela `config` (key/value) para armazenar o folder_id da pasta-fonte do Drive
--   2. Coluna `drive_id` em `arquivos` para evitar duplicatas no sync
-- =========================================================

-- 1. TABELA CONFIG (key/value, somente admin pode editar) ---
CREATE TABLE IF NOT EXISTS public.config (
  key         text PRIMARY KEY,
  value       text,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem LER
DROP POLICY IF EXISTS "config_select_all" ON public.config;
CREATE POLICY "config_select_all" ON public.config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admin pode UPSERT
DROP POLICY IF EXISTS "config_admin_write" ON public.config;
CREATE POLICY "config_admin_write" ON public.config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Pré-popula com o ID da pasta pública atual (link "Abrir Drive" da biblioteca)
INSERT INTO public.config (key, value, description)
VALUES ('biblioteca_drive_folder_id', '15ac3Hmg3ujAHhNUJdn1UKuw4AqaaBzuc',
        'ID da pasta pública do Google Drive sincronizada com a biblioteca')
ON CONFLICT (key) DO NOTHING;


-- 2. COLUNA drive_id em arquivos --------------------------
ALTER TABLE public.arquivos
  ADD COLUMN IF NOT EXISTS drive_id text;

CREATE UNIQUE INDEX IF NOT EXISTS arquivos_drive_id_uniq
  ON public.arquivos (drive_id) WHERE drive_id IS NOT NULL;
