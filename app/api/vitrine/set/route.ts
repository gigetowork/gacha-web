import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

const SHOWCASE_SLOTS = 3;

// Équivalent web de "!vitrine <nom>" / "!vitrine <1-3> <nom>" dans bot.py : place un objet de
// l'inventaire du joueur dans un slot de vitrine (précis, ou le premier libre si aucun n'est
// donné). Même table `showcase`, même clé primaire (user_id, slot), même upsert -- ce qui
// s'affiche ici est ensuite EXACTEMENT ce que `!vitrine`/`!profil` affichent sur Discord.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const discordId = (session.user as any)?.discordId as string;

  const body = await req.json().catch(() => null);
  const rowid = Number(body?.rowid);
  let slot = body?.slot != null ? Number(body.slot) : undefined;

  if (!Number.isInteger(rowid)) {
    return NextResponse.json({ error: "invalid_item" }, { status: 400 });
  }
  if (slot !== undefined && (!Number.isInteger(slot) || slot < 1 || slot > SHOWCASE_SLOTS)) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // L'objet doit vraiment appartenir au joueur (sinon on pourrait mettre en vitrine le skin
    // de quelqu'un d'autre en devinant son rowid).
    const owns = await client.query(
      `SELECT rowid FROM inventory WHERE rowid = $1 AND user_id = $2::bigint`,
      [rowid, discordId]
    );
    if (owns.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "item_not_owned" }, { status: 403 });
    }

    if (slot === undefined) {
      const used = await client.query<{ slot: number }>(
        `SELECT slot FROM showcase WHERE user_id = $1::bigint`,
        [discordId]
      );
      const usedSlots = new Set(used.rows.map((r) => r.slot));
      let free: number | undefined;
      for (let s = 1; s <= SHOWCASE_SLOTS; s++) {
        if (!usedSlots.has(s)) {
          free = s;
          break;
        }
      }
      if (free === undefined) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "showcase_full" }, { status: 409 });
      }
      slot = free;
    }

    await client.query(
      `INSERT INTO showcase (user_id, slot, inv_rowid) VALUES ($1::bigint, $2, $3)
       ON CONFLICT (user_id, slot) DO UPDATE SET inv_rowid = excluded.inv_rowid`,
      [discordId, slot, rowid]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, slot });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur vitrine/set:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    client.release();
  }
}
