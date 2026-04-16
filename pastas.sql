-- ==================================================
-- HERÁCLITO — Sistema de Pastas e Subpastas
-- Execute no Supabase SQL Editor
-- ==================================================

-- 1. Disciplina do professor (campo de texto livre)
ALTER TABLE users ADD COLUMN IF NOT EXISTS disciplina TEXT;

-- 2. Tabela de pastas (hierarquia auto-referenciada)
CREATE TABLE IF NOT EXISTS folders (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
  owner_id   UUID REFERENCES users(id)   ON DELETE SET NULL,
  tipo       TEXT NOT NULL DEFAULT 'sub'
             CHECK (tipo IN ('global', 'professor', 'sub')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner_id  ON folders(owner_id);

-- 3. Vincular arquivos a pastas
ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS folder_id UUID
  REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_arquivos_folder_id ON arquivos(folder_id);

-- 4. RLS na tabela folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read folders"
  ON folders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers and admins can insert folders"
  ON folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'teacher')
        AND approved = TRUE
    )
  );

CREATE POLICY "Owners and admins can update folders"
  ON folders FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Owners and admins can delete folders"
  ON folders FOR DELETE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Pasta global "Materiais Diversos" (inserida uma única vez)
INSERT INTO folders (name, tipo)
SELECT 'Materiais Diversos', 'global'
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE tipo = 'global');
