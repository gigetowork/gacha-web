import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import EquipmentClient, { type InventoryItem, type ShowcaseSlot } from "../components/EquipmentClient";

// Page "Équipement" : reprend la vraie fonctionnalité !vitrine du bot (table `showcase`,
// 3 emplacements max, référencés par le rowid de l'objet dans `inventory`). Ce qu'on affiche
// ici est donc EXACTEMENT ce que `!vitrine` / `!profil` affichent sur Discord -- équiper un skin
// ici l'affiche sur Discord, et inversement.
//
// Il n'existe aucun modèle de personnage 3D dans ce projet (juste des images 2D de skins depuis
// skins.json), donc pas de mannequin à habiller façon CS2 -- à la place, 3 "cadres" de vitrine et
// une liste filtrable du vrai inventaire, sur un fond flouté comme demandé.
const SHOWCASE_SLOTS = 3;

export default async function EquipementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
        <p>Connecte-toi avec Discord pour gérer ton équipement.</p>
        <Link href="/" style={{ color: "#5865F2" }}>
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  const discordId = (session.user as any)?.discordId as string;

  const [invRes, showcaseRes] = await Promise.all([
    pool.query<InventoryItem>(
      `SELECT rowid, skin_name, rarity, condition_type, wear_state, price, image_url, weapon
       FROM inventory
       WHERE user_id = $1::bigint
       ORDER BY price DESC NULLS LAST`,
      [discordId]
    ),
    pool.query<ShowcaseSlot>(
      `SELECT sc.slot, inv.rowid, inv.skin_name, inv.rarity, inv.condition_type, inv.wear_state,
              inv.price, inv.image_url, inv.weapon
       FROM showcase sc
       JOIN inventory inv ON inv.rowid = sc.inv_rowid AND inv.user_id = sc.user_id
       WHERE sc.user_id = $1::bigint
       ORDER BY sc.slot`,
      [discordId]
    ),
  ]);

  // 3 emplacements fixes (vide = null), remplis avec ce qu'on a trouvé.
  const slots: (ShowcaseSlot | null)[] = Array.from({ length: SHOWCASE_SLOTS }, (_, i) => {
    const found = showcaseRes.rows.find((r) => r.slot === i + 1);
    return found ?? null;
  });

  return (
    <main style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Fond flouté (même bannière que l'accueil), comme sur la capture d'écran CS2 fournie. */}
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

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h1 style={{ margin: 0, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>🖼️ Équipement</h1>
          <Link href="/" style={{ color: "#ddd", fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            ← Accueil
          </Link>
        </div>
        <p style={{ opacity: 0.85, color: "#ddd", marginTop: -12, marginBottom: 28, fontSize: 13, maxWidth: 640 }}>
          Ta vitrine (identique à <code>!vitrine</code> sur Discord, affichée par <code>!profil</code>) : jusqu'à 3
          skins mis en avant. Équiper ici met à jour Discord, et inversement.
        </p>

        <EquipmentClient initialInventory={invRes.rows} initialSlots={slots} />
      </div>
    </main>
  );
}
