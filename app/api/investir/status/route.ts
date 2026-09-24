import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { INVEST_RETURN_MAX, INVEST_RETURN_MIN } from "@/lib/invest";

// Appelé au chargement de la page ET en polling pendant qu'un investissement est actif. Fait deux
// choses :
// 1) Règle l'investissement du joueur si son échéance est dépassée -- EXACTEMENT la même logique
//    que finish_investment() dans bot.py (même fourchette de rendement, même "réservation" de la
//    ligne via UPDATE ... WHERE status='active' avant de payer, pour ne jamais payer deux fois même
//    si le site et le bot vérifient au même moment).
// 2) Renvoie l'état courant : l'investissement actif restant (s'il y en a un), ou le résultat qui
//    vient d'être réglé (pour déclencher l'animation de révélation côté client).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const discordId = (session.user as any)?.discordId as string;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dueRes = await client.query(
      `SELECT invest_id, amount FROM investments
       WHERE user_id = $1::bigint AND status = 'active' AND end_ts <= $2
       LIMIT 1`,
      [discordId, Date.now() / 1000]
    );

    let resolved: { amount: number; payout: number; profit: number } | null = null;

    if (dueRes.rows.length > 0) {
      const { invest_id, amount } = dueRes.rows[0] as { invest_id: number; amount: number };
      const mult = 1 + (INVEST_RETURN_MIN + Math.random() * (INVEST_RETURN_MAX - INVEST_RETURN_MIN));
      const payout = Math.round(amount * mult);

      const upd = await client.query(
        `UPDATE investments SET status = 'done', payout = $1 WHERE invest_id = $2 AND status = 'active'`,
        [payout, invest_id]
      );
      if (upd.rowCount === 1) {
        await client.query(
          `INSERT INTO economy (user_id, coins) VALUES ($1::bigint, $2)
           ON CONFLICT (user_id) DO UPDATE SET coins = economy.coins + $2`,
          [discordId, payout]
        );
        resolved = { amount, payout, profit: payout - amount };
      }
    }

    const activeRes = await client.query(
      `SELECT invest_id, user_id, amount, channel_id, start_ts, end_ts, status, payout
       FROM investments WHERE user_id = $1::bigint AND status = 'active' LIMIT 1`,
      [discordId]
    );

    const coinsRes = await client.query<{ coins: number }>(
      `SELECT coins FROM economy WHERE user_id = $1::bigint`,
      [discordId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      active: activeRes.rows[0] ?? null,
      resolved,
      coins: coinsRes.rows[0]?.coins ?? 0,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur investir/status:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    client.release();
  }
}
