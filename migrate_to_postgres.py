"""
Migration ponctuelle : copie toutes les données de gacha.db (SQLite, l'ancienne base locale du
bot) vers la base Postgres (Supabase) pointée par DATABASE_URL.

À LANCER UNE SEULE FOIS, depuis le Shell de BOT-HOSTING.net, dans le même dossier que bot.py et
gacha.db :

    python3 migrate_to_postgres.py

Sans danger à relancer plusieurs fois : le script VIDE d'abord les tables Postgres avant d'y
recopier les données SQLite, donc pas de doublons possibles.
"""
import os
import sqlite3

import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL n'est pas défini -> rien à faire, configure-le d'abord.")

# Tables qui ont un identifiant auto-incrémenté (BIGSERIAL côté Postgres) référencé ailleurs
# (inventory.rowid est utilisé par games.inv_rowid et showcase.inv_rowid) -> on DOIT recopier
# les valeurs exactes, pas laisser Postgres en générer de nouvelles, sinon ces références
# pointeraient vers le mauvais skin. On corrige la séquence Postgres à la fin pour chaque table.
SERIAL_PK = {
    "inventory": "rowid",
    "market": "sale_id",
    "games": "game_id",
    "investments": "invest_id",
}

# Ordre sans importance ici : aucune vraie contrainte de clé étrangère entre les tables (les
# rowid/inv_rowid sont juste des entiers, pas des FOREIGN KEY), donc pas de souci d'ordre.
ALL_TABLES = [
    "inventory", "economy", "market", "arena", "games", "players",
    "cooldowns", "mission_progress", "free_case_claims", "daily_claims",
    "steal_protection", "investments", "showcase",
]

sconn = sqlite3.connect("gacha.db")
scur = sconn.cursor()
pconn = psycopg2.connect(DATABASE_URL)
pcur = pconn.cursor()


def sqlite_columns(table):
    return [row[1] for row in scur.execute(f"PRAGMA table_info({table})").fetchall()]


def pg_columns(table):
    pcur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
        (table,),
    )
    return {row[0] for row in pcur.fetchall()}


total_rows = 0
for table in ALL_TABLES:
    cols = sqlite_columns(table)
    pk = SERIAL_PK.get(table)
    if pk and pk not in cols:
        # inventory n'a pas de colonne "rowid" explicite en SQLite (c'est l'identifiant implicite
        # de la ligne) -> on la demande quand même explicitement dans le SELECT.
        cols = [pk] + cols

    # gacha.db peut contenir des colonnes héritées d'anciennes versions du bot (ex: "character_name")
    # qui n'existent plus dans le schéma Postgres actuel -> on ne garde que les colonnes présentes
    # des DEUX côtés, pour ne migrer que ce que le bot utilise vraiment aujourd'hui.
    existing_pg = pg_columns(table)
    cols = [c for c in cols if c in existing_pg]

    col_list = ", ".join(cols)
    rows = scur.execute(f"SELECT {col_list} FROM {table}").fetchall()

    pcur.execute(f"DELETE FROM {table}")  # on repart d'une copie propre à chaque exécution

    if rows:
        placeholders = ", ".join(["%s"] * len(cols))
        pcur.executemany(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})", rows)

    print(f"{table}: {len(rows)} ligne(s) migrée(s)")
    total_rows += len(rows)

# Remet les compteurs auto-incrémentés (BIGSERIAL) à jour, sinon le prochain !pull/!case/!game
# pourrait essayer de réutiliser un rowid déjà pris par une ligne qu'on vient d'importer.
for table, pk in SERIAL_PK.items():
    pcur.execute(
        f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), "
        f"GREATEST((SELECT COALESCE(MAX({pk}), 0) FROM {table}), 1))"
    )

pconn.commit()
sconn.close()
pconn.close()
print(f"\n✅ Migration terminée : {total_rows} ligne(s) au total copiées de gacha.db vers Postgres.")
