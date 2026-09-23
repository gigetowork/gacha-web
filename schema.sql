-- Schéma Postgres pour Supabase, équivalent du gacha.db (SQLite) du bot.
-- À exécuter dans Supabase : Project > SQL Editor > New query > coller tout > Run.
--
-- Différences volontaires avec le SQLite d'origine :
--   - INTEGER (pour les IDs Discord) -> BIGINT, car un ID Discord dépasse la taille d'un INTEGER Postgres.
--   - Le "rowid" implicite de SQLite (utilisé partout dans inventory.rowid, games.inv_rowid, etc.)
--     devient une vraie colonne "id BIGSERIAL PRIMARY KEY" explicite : Postgres n'a pas de rowid
--     auto caché fiable comme SQLite.

CREATE TABLE IF NOT EXISTS inventory (
    -- Nommée "rowid" (pas "id") exprès : SQLite donnait un identifiant "rowid" implicite à chaque
    -- ligne, et tout le code du bot s'y réfère directement (SELECT rowid FROM inventory ...). En
    -- gardant ce nom ici, aucune requête du bot n'a besoin d'être réécrite pour ça.
    rowid BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    skin_name TEXT,
    rarity TEXT,
    condition_type TEXT,
    wear_state TEXT,
    price REAL,
    image_url TEXT,
    weapon TEXT
);

CREATE TABLE IF NOT EXISTS economy (
    user_id BIGINT PRIMARY KEY,
    coins INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market (
    sale_id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT,
    skin_name TEXT,
    rarity TEXT,
    price REAL,
    wear_state TEXT,
    condition_type TEXT,
    skin_value REAL,
    image_url TEXT,
    weapon TEXT
);

CREATE TABLE IF NOT EXISTS arena (
    user_id BIGINT PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS games (
    game_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    inv_rowid BIGINT,
    skin_name TEXT,
    rarity TEXT,
    wear_state TEXT,
    skin_value REAL,
    image_url TEXT,
    channel_id BIGINT,
    start_ts DOUBLE PRECISION,
    end_ts DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    score INTEGER,
    won INTEGER,
    coins INTEGER,
    weapon TEXT,
    condition_type TEXT
);

CREATE TABLE IF NOT EXISTS players (
    user_id BIGINT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cooldowns (
    user_id BIGINT,
    key TEXT,
    ready_ts DOUBLE PRECISION,
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS mission_progress (
    user_id BIGINT,
    period TEXT,
    mission_key TEXT,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, period, mission_key)
);

CREATE TABLE IF NOT EXISTS free_case_claims (
    user_id BIGINT PRIMARY KEY,
    day TEXT
);

CREATE TABLE IF NOT EXISTS daily_claims (
    user_id BIGINT PRIMARY KEY,
    day TEXT,
    streak INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS steal_protection (
    user_id BIGINT PRIMARY KEY,
    protected_until DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS investments (
    invest_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    amount INTEGER,
    channel_id BIGINT,
    start_ts DOUBLE PRECISION,
    end_ts DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    payout INTEGER
);

CREATE TABLE IF NOT EXISTS showcase (
    user_id BIGINT,
    slot INTEGER,
    inv_rowid BIGINT,
    PRIMARY KEY (user_id, slot)
);
