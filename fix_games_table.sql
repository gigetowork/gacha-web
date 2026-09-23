-- Corrige la table "games" de ta base Supabase existante : la première version de schema.sql
-- que tu as exécutée oubliait 6 colonnes. À exécuter UNE FOIS dans Supabase (SQL Editor > New query).
-- Sans danger si une colonne existe déjà (IF NOT EXISTS).

ALTER TABLE games ADD COLUMN IF NOT EXISTS kills INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS deaths INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS assists INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS won INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS coins INTEGER;
