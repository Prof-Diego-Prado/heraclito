-- ==================================================
-- HERÁCLITO — Anotações de PDF por usuário
-- Execute no Supabase SQL Editor
-- ==================================================

CREATE TABLE IF NOT EXISTS pdf_annotations (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  pdf_url    TEXT NOT NULL,
  dados      JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, pdf_url)
);

ALTER TABLE pdf_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê apenas as próprias anotações"
  ON pdf_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário salva apenas as próprias anotações"
  ON pdf_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza apenas as próprias anotações"
  ON pdf_annotations FOR UPDATE
  USING (auth.uid() = user_id);
