import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

const SHOWCASE_SLOTS = 3;

// Équivalent web de "!vitrine retirer <1-3>" (un slot précis) ou "!vitrine vider" (tout, si aucun
// slot n'est donné) dans bot.py.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const discordId = (session.user as any)?.discordId as string;

  const body = await req.json().catch(() => null);
  const slot = body?.slot != null ? Number(body.slot) : undefined;

  if (slot !== undefined && (!Number.isInteger(slot) || slot < 1 || slot > SHOWCASE_SLOTS)) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  try {
    if (slot === undefined) {
      await pool.query(`DELETE FROM showcase WHERE user_id = $1::bigint`, [discordId]);
    } else {
      await pool.query(`DELETE FROM showcase WHERE user_id = $1::bigint AND slot = $2`, [discordId, slot]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur vitrine/clear:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
