import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { pool } from "../../lib/db";

type InventoryRow = {
  rowid: number;
  skin_name: string;
  rarity: string;
  condition_type: string | null;
  wear_state: string | null;
  price: number | null;
  image_url: string | null;
  weapon: string | null;
};

// Couleur de bordure par rareté, pour un coup d'oeil visuel façon CS:GO (les paliers ★ Couteau/
// ★ Gants gardent leur violet distinctif). Si une nouvelle rareté est ajoutée côté bot et n'est pas
// listée ici, elle retombe simplement sur le gris par défaut -> jamais d'erreur, juste moins joli.
const RARITY_COLORS: Record<string, string> = {
  "Industrial Grade ⚪": "#B0C3D9",
  "Mil-Spec Grade 🔵": "#4B69FF",
  "Restricted 🟣": "#8847FF",
  "Classified 🩷": "#D32CE6",
  "Covert 🔴": "#EB4B4B",
  "★ Couteau 🔪": "#FFD700",
  "★ Gants 🧤": "#FFD700",
};

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
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>🎒 Ton inventaire</h1>
        <Link href="/" style={{ color: "#888", fontSize: 14 }}>
          ← Accueil
        </Link>
      </div>

      <p style={{ opacity: 0.7, marginBottom: 32 }}>
        {rows.length} skin{rows.length > 1 ? "s" : ""} — valeur totale : <strong>{totalValue.toFixed(2)} $</strong>
      </p>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucun skin pour l'instant — fais `!pull` ou ouvre une caisse sur Discord !</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {rows.map((item) => {
            const color = RARITY_COLORS[item.rarity] ?? "#666";
            return (
              <div
                key={item.rowid}
                style={{
                  background: "#171a21",
                  border: `1px solid ${color}55`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.skin_name}
                    style={{ width: "100%", height: 100, objectFit: "contain", marginBottom: 8 }}
                  />
                )}
                <div style={{ fontSize: 13, opacity: 0.7 }}>{item.weapon}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {item.condition_type === "StatTrak" ? "StatTrak™ " : ""}
                  {item.condition_type === "Souvenir" ? "Souvenir " : ""}
                  {item.skin_name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{item.wear_state}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
                  <span style={{ color }}>{item.rarity}</span>
                  <span>{item.price?.toFixed(2)} $</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
