-- ==================================================
-- HERÁCLITO — Coluna drive_url nas pastas
-- Execute no Supabase SQL Editor
-- ==================================================

-- Adiciona campo opcional de link do Google Drive em cada pasta
ALTER TABLE folders ADD COLUMN IF NOT EXISTS drive_url TEXT;
