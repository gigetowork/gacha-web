import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { INVEST_DURATION_SECONDS, INVEST_MIN_AMOUNT, MAX_CONCURRENT_INVESTMENTS } from "@/lib/invest";

// Équivalent web de "!invest <montant>" dans bot.py : débite les pièces (atomique) et bloque le
// montant pour 1h contre un rendement garanti. Même table `investments`, mêmes règles (1 seul actif
// à la fois, minimum 50 🪙) -- ce qui est placé ici est ensuite réglé par la même tâche périodique
// du bot (ou par /api/investir/status si le site est consulté avant que le bot n'y passe).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const discordId = (session.user as any)?.discordId as string;

  const body = await req.json().catch(() => null);
  const montant = Number(body?.montant);
  if (!Number.isInteger(montant) || montant < INVEST_MIN_AMOUNT) {
    return NextResponse.json({ error: "invalid_amount", min: INVEST_MIN_AMOUNT }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const running = await client.query(
      `SELECT invest_id FROM investments WHERE user_id = $1::bigint AND status = 'active'`,
      [discordId]
    );
    if (running.rows.length >= MAX_CONCURRENT_INVESTMENTS) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "already_active" }, { status: 409 });
    }

    const debit = await client.query(
      `UPDATE economy SET coins = coins - $1 WHERE user_id = $2::bigint AND coins >= $1`,
      [montant, discordId]
    );
    if (debit.rowCount !== 1) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "insufficient_funds" }, { status: 400 });
    }

    const startTs = Date.now() / 1000;
    const endTs = startTs + INVEST_DURATION_SECONDS;
    const insertRes = await client.query(
      `INSERT INTO investments (user_id, amount, channel_id, start_ts, end_ts, status)
       VALUES ($1::bigint, $2, NULL, $3, $4, 'active')
       RETURNING invest_id, user_id, amount, channel_id, start_ts, end_ts, status, payout`,
      [discordId, montant, startTs, endTs]
    );

    await client.query("COMMIT");
    return NextResponse.json({ active: insertRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur investir/place:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    client.release();
  }
}
