import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { rollSkin, findCase, DUPLICATE_XP, missionDayKey } from "@/lib/caisses";

// Ouvre réellement une caisse : débite les pièces (ou réclame la caisse gratuite), tire un skin
// avec EXACTEMENT la même logique que bot.py, et l'ajoute en base (ou le convertit en XP si
// doublon) -- la même base Postgres que lit/écrit le bot Discord.
//
// Tout se passe dans une transaction (BEGIN/COMMIT/ROLLBACK) : si une étape échoue, RIEN n'est
// appliqué -- impossible de débiter des pièces sans recevoir de skin, ou l'inverse.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const discordId = (session.user as any)?.discordId as string;

  const body = await req.json().catch(() => null);
  const caseKey = body?.caseKey as string | undefined;
  const caseConfig = caseKey ? findCase(caseKey) : undefined;
  if (!caseConfig) {
    return NextResponse.json({ error: "invalid_case" }, { status: 400 });
  }

  // Ouverture multiple (x1 ou x5) : accélère les ouvertures pour les joueurs qui ont les moyens
  // d'acheter plusieurs caisses d'un coup. La caisse gratuite reste toujours x1 (une seule par
  // jour, ça n'a pas de sens de la "x5").
  const rawCount = body?.count;
  const count = caseConfig.free ? 1 : rawCount === 5 ? 5 : 1;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (caseConfig.free) {
      // Réclamation atomique de la caisse gratuite du jour : identique à open_case() dans bot.py
      // (upsert conditionnel -> 0 ligne affectée si déjà réclamée aujourd'hui, ce qui protège
      // aussi contre un double-clic très rapide sur le bouton).
      const today = missionDayKey();
      const claim = await client.query(
        `INSERT INTO free_case_claims (user_id, day) VALUES ($1::bigint, $2)
         ON CONFLICT (user_id) DO UPDATE SET day = excluded.day
         WHERE free_case_claims.day != excluded.day`,
        [discordId, today]
      );
      if (claim.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "free_case_already_claimed" }, { status: 409 });
      }
    } else {
      // Paiement atomique du prix total (prix x count) : ne passe que si le solde est suffisant
      // (protège aussi contre un double-clic qui débiterait deux fois).
      const totalPrice = caseConfig.price * count;
      const debit = await client.query(
        `UPDATE economy SET coins = coins - $1 WHERE user_id = $2::bigint AND coins >= $1`,
        [totalPrice, discordId]
      );
      if (debit.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "insufficient_funds" }, { status: 400 });
      }
    }

    // Un tirage par ouverture, tous enregistrés comme acquis avant toute animation côté client.
    // Les doublons sont détectés au fur et à mesure (donc deux ZiziTraillette d'affilée dans le
    // même x5 seraient bien vus comme doublon l'un de l'autre).
    const opens: {
      duplicate: boolean;
      xpGain: number;
      skin: { name: string; weapon: string };
      rarity: string;
      wear: string;
      variant: string;
      price: number;
      image: string;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const { skin, rarity, wear, variant, price, image } = rollSkin(caseConfig.weights);
      const weapon = skin.weapon || "AK-47";

      // Doublon : même arme + même usure + même variante déjà en inventaire -> converti en XP
      // (DUPLICATE_MATCH_WEAR=True côté bot.py, comportement reproduit ici).
      const dupRes = await client.query(
        `SELECT 1 FROM inventory WHERE user_id = $1::bigint AND skin_name = $2 AND wear_state = $3
         AND weapon = $4 AND condition_type = $5 LIMIT 1`,
        [discordId, skin.name, wear, weapon, variant]
      );

      let duplicate = false;
      let xpGain = 0;
      if (dupRes.rows.length > 0) {
        duplicate = true;
        xpGain = DUPLICATE_XP[rarity] ?? 5;
        await client.query(
          `INSERT INTO players (user_id) VALUES ($1::bigint) ON CONFLICT (user_id) DO NOTHING`,
          [discordId]
        );
        await client.query(`UPDATE players SET xp = xp + $1 WHERE user_id = $2::bigint`, [xpGain, discordId]);
      } else {
        await client.query(
          `INSERT INTO inventory (user_id, skin_name, rarity, condition_type, wear_state, price, image_url, weapon)
           VALUES ($1::bigint, $2, $3, $4, $5, $6, $7, $8)`,
          [discordId, skin.name, rarity, variant, wear, price, image, weapon]
        );
      }

      opens.push({ duplicate, xpGain, skin: { name: skin.name, weapon }, rarity, wear, variant, price, image });
    }

    const coinsRes = await client.query<{ coins: number }>(
      `SELECT coins FROM economy WHERE user_id = $1::bigint`,
      [discordId]
    );
    const coins = coinsRes.rows[0]?.coins ?? 0;

    await client.query("COMMIT");

    // Rouleau visuel façon CS:GO -- UNIQUEMENT pour une ouverture x1 (x5 saute l'animation et
    // affiche directement les 5 résultats, voir CaseDetailClient). ~60 objets tirés au hasard avec
    // les MÊMES probabilités que la caisse (purement pour le décor du défilement, aucun impact sur
    // le résultat ni sur la base -- le vrai gain a déjà été tiré et enregistré ci-dessus), avec le
    // vrai gain inséré à WIN_INDEX pour que l'animation s'arrête pile dessus.
    let reel: { name: string; weapon: string; rarity: string; image: string }[] | undefined;
    let winIndex: number | undefined;
    if (count === 1) {
      const first = opens[0];
      const REEL_LENGTH = 60;
      const WIN_INDEX = 52;
      winIndex = WIN_INDEX;
      reel = Array.from({ length: REEL_LENGTH }, (_, i) => {
        if (i === WIN_INDEX) {
          return { name: first.skin.name, weapon: first.skin.weapon, rarity: first.rarity, image: first.image };
        }
        const filler = rollSkin(caseConfig.weights);
        return {
          name: filler.skin.name,
          weapon: filler.skin.weapon || "AK-47",
          rarity: filler.rarity,
          image: filler.image,
        };
      });
    }

    return NextResponse.json({
      coins,
      caseName: caseConfig.name,
      count,
      opens,
      reel,
      winIndex,
      // Champs "à plat" dépréciés, gardés pour compat avec un éventuel ancien client en cache :
      // reflètent toujours le PREMIER (et pour x1, unique) tirage.
      duplicate: opens[0].duplicate,
      xpGain: opens[0].xpGain,
      skin: opens[0].skin,
      rarity: opens[0].rarity,
      wear: opens[0].wear,
      variant: opens[0].variant,
      price: opens[0].price,
      image: opens[0].image,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur ouverture de caisse:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    client.release();
  }
}
