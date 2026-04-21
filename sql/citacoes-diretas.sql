-- citacoes-diretas.sql
-- Executar no Supabase SQL Editor (Table Editor > SQL Editor > New query)

-- ─── 1. TABELA: referencias ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referencias (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             TEXT NOT NULL DEFAULT 'livro'
                     CHECK (tipo IN ('livro','artigo','tese','dissertacao','capitulo','site','outro')),
  autores          TEXT,
  titulo           TEXT NOT NULL,
  subtitulo        TEXT,
  ano              INTEGER,
  editora          TEXT,
  local_publicacao TEXT,
  doi              TEXT,
  url              TEXT,
  pdf_url          TEXT,
  pdf_path         TEXT,
  revista          TEXT,
  volume           TEXT,
  numero           TEXT,
  paginas          TEXT,
  edicao           TEXT,
  instituicao      TEXT,
  nivel_academico  TEXT CHECK (nivel_academico IN ('mestrado','doutorado')),
  citacao_abnt     TEXT,
  pdf_nome         TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Colunas pdf_url / pdf_path para quem já criou a tabela sem elas
ALTER TABLE referencias ADD COLUMN IF NOT EXISTS pdf_url  TEXT;
ALTER TABLE referencias ADD COLUMN IF NOT EXISTS pdf_path TEXT;

CREATE INDEX IF NOT EXISTS idx_referencias_pdf_url  ON referencias(pdf_url);
CREATE INDEX IF NOT EXISTS idx_referencias_pdf_path ON referencias(pdf_path);
CREATE INDEX IF NOT EXISTS idx_referencias_tipo      ON referencias(tipo);
CREATE INDEX IF NOT EXISTS idx_referencias_created_by ON referencias(created_by);

ALTER TABLE referencias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referencias' AND policyname='Referencias visíveis para todos') THEN
    CREATE POLICY "Referencias visíveis para todos" ON referencias FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referencias' AND policyname='Usuários autenticados podem inserir referências') THEN
    CREATE POLICY "Usuários autenticados podem inserir referências" ON referencias FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referencias' AND policyname='Autor ou admin pode atualizar referência') THEN
    CREATE POLICY "Autor ou admin pode atualizar referência" ON referencias FOR UPDATE
      USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
  END IF;
END $$;

-- ─── 2. TABELA: citacoes_diretas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citacoes_diretas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referencia_id     UUID REFERENCES referencias(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  trecho            TEXT,
  pagina            INTEGER NOT NULL,
  pagina_fim        INTEGER,
  citacao_formatada TEXT,
  anotacao_pessoal  TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citacoes_ref     ON citacoes_diretas(referencia_id);
CREATE INDEX IF NOT EXISTS idx_citacoes_user    ON citacoes_diretas(user_id);
CREATE INDEX IF NOT EXISTS idx_citacoes_created ON citacoes_diretas(created_at DESC);

ALTER TABLE citacoes_diretas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='citacoes_diretas' AND policyname='Usuário vê suas próprias citações') THEN
    CREATE POLICY "Usuário vê suas próprias citações" ON citacoes_diretas FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='citacoes_diretas' AND policyname='Usuário insere suas próprias citações') THEN
    CREATE POLICY "Usuário insere suas próprias citações" ON citacoes_diretas FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='citacoes_diretas' AND policyname='Usuário deleta suas próprias citações') THEN
    CREATE POLICY "Usuário deleta suas próprias citações" ON citacoes_diretas FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
