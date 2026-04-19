-- ==================================================
-- HERÁCLITO — Hierarquia de pastas das disciplinas
-- Execute no Supabase SQL Editor
-- Cria: Disciplinas > Disc. X > Nome do Professor
-- ==================================================

DO $$
DECLARE
  admin_id   UUID;
  root_id    UUID;
  disc1_id   UUID;
  disc2_id   UUID;
  disc3_id   UUID;
BEGIN
  -- Pega o id do admin
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;

  -- 1. Pasta raiz "Disciplinas" (só cria se não existir)
  SELECT id INTO root_id FROM folders WHERE name = 'Disciplinas' AND parent_id IS NULL LIMIT 1;
  IF root_id IS NULL THEN
    INSERT INTO folders (name, tipo, created_by)
    VALUES ('Disciplinas', 'global', admin_id)
    RETURNING id INTO root_id;
  END IF;

  -- 2. Subpasta Disciplina 1
  SELECT id INTO disc1_id FROM folders WHERE name = 'Disc. 1 — Processos Inovadores' AND parent_id = root_id LIMIT 1;
  IF disc1_id IS NULL THEN
    INSERT INTO folders (name, tipo, parent_id, created_by)
    VALUES ('Disc. 1 — Processos Inovadores', 'sub', root_id, admin_id)
    RETURNING id INTO disc1_id;
  END IF;

  -- Professores da Disc. 1
  INSERT INTO folders (name, tipo, parent_id, created_by)
  SELECT 'Prof. Dr. Flávio Rodrigues de Oliveira', 'sub', disc1_id, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Prof. Dr. Flávio Rodrigues de Oliveira' AND parent_id = disc1_id);

  INSERT INTO folders (name, tipo, parent_id, created_by)
  SELECT 'Profª. Dra. Maria Luisa Furlan Costa', 'sub', disc1_id, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Profª. Dra. Maria Luisa Furlan Costa' AND parent_id = disc1_id);

  -- 3. Subpasta Disciplina 2
  SELECT id INTO disc2_id FROM folders WHERE name = 'Disc. 2 — Métodos e Pesquisa' AND parent_id = root_id LIMIT 1;
  IF disc2_id IS NULL THEN
    INSERT INTO folders (name, tipo, parent_id, created_by)
    VALUES ('Disc. 2 — Métodos e Pesquisa', 'sub', root_id, admin_id)
    RETURNING id INTO disc2_id;
  END IF;

  INSERT INTO folders (name, tipo, parent_id, created_by)
  SELECT 'Profª. Dra. Marli D. A. Futata', 'sub', disc2_id, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Profª. Dra. Marli D. A. Futata' AND parent_id = disc2_id);

  -- 4. Subpasta Disciplina 3
  SELECT id INTO disc3_id FROM folders WHERE name = 'Disc. 3 — Pesquisas e Tecnologias' AND parent_id = root_id LIMIT 1;
  IF disc3_id IS NULL THEN
    INSERT INTO folders (name, tipo, parent_id, created_by)
    VALUES ('Disc. 3 — Pesquisas e Tecnologias', 'sub', root_id, admin_id)
    RETURNING id INTO disc3_id;
  END IF;

  INSERT INTO folders (name, tipo, parent_id, created_by)
  SELECT 'Profª. Dra. Marli D. A. Futata', 'sub', disc3_id, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Profª. Dra. Marli D. A. Futata' AND parent_id = disc3_id);

  INSERT INTO folders (name, tipo, parent_id, created_by)
  SELECT 'Profª. Dra. Renata Oliveira dos Santos', 'sub', disc3_id, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Profª. Dra. Renata Oliveira dos Santos' AND parent_id = disc3_id);

END $$;
