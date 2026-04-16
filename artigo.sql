-- ==================================================
-- HERÁCLITO — Tipo especial "Artigo" no calendário
-- Execute no Supabase SQL Editor
-- ==================================================

ALTER TABLE aulas ADD COLUMN IF NOT EXISTS is_artigo BOOLEAN DEFAULT FALSE;
