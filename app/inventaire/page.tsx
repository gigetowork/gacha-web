import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import InventoryClient, { type InventoryRow } from "../components/InventoryClient";

export default async function InventairePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
        <p>Connecte-toi avec Discord pour voir ton inventaire.</p>
        <Link href="/" style={{ color: "#5865F2" }}>
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  const discordId = (session.user as any)?.discordId as string;

  const { rows } = await pool.query<InventoryRow>(
    `SELECT rowid, skin_name, rarity, condition_type, wear_state, price, image_url, weapon
     FROM inventory
     WHERE user_id = $1::bigint
     ORDER BY price DESC NULLS LAST`,
    [discordId]
  );

  const totalValue = rows.reduce((sum, r) => sum + (r.price ?? 0), 0);

  return (
    <main style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Même fond flouté que la page Équipement (ta bannière, floutée et assombrie). */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          backgroundImage: "url(/images/hero-banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(18px) brightness(0.45) saturate(1.1)",
          transform: "scale(1.1)",
        }}
      />
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: "rgba(13,17,23,0.35)" }} />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h1 style={{ margin: 0, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>🎒 Ton inventaire</h1>
          <Link href="/" style={{ color: "#ddd", fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            ← Accueil
          </Link>
        </div>

        <p style={{ opacity: 0.85, color: "#ddd", marginBottom: 32 }}>
          {rows.length} skin{rows.length > 1 ? "s" : ""} — valeur totale : <strong>{totalValue.toFixed(2)} $</strong>
        </p>

        {rows.length === 0 ? (
          <p style={{ opacity: 0.7, color: "#ddd" }}>
            Aucun skin pour l'instant — fais `!pull` ou ouvre une caisse sur Discord !
          </p>
        ) : (
          <InventoryClient items={rows} />
        )}
      </div>
    </main>
  );
}
