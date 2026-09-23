import { Pool } from "pg";

// Un seul pool de connexions partagé pour toute l'appli (évite d'ouvrir une nouvelle connexion
// Postgres à chaque requête). En développement, Next.js recharge parfois ce fichier à chaud, donc
// on garde le pool sur l'objet global pour ne pas en recréer un à chaque rechargement.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase exige une connexion chiffrée
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
