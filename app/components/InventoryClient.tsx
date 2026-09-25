"use client";

import { useEffect, useState } from "react";

export type InventoryRow = {
  rowid: number;
  skin_name: string;
  rarity: string;
  condition_type: string | null;
  wear_state: string | null;
  price: number | null;
  image_url: string | null;
  weapon: string | null;
};

const PANEL = "rgba(23,26,33,0.92)";

// Couleur de bordure par rareté, pour un coup d'oeil visuel façon CS:GO (les paliers ★ Couteau/
// ★ Gants gardent leur doré distinctif). Si une nouvelle rareté est ajoutée côté bot et n'est pas
// listée ici, elle retombe simplement sur le gris par défaut -> jamais d'erreur, juste moins joli.
const RARITY_COLORS: Record<string, string> = {
  "Industrial Grade ⚪": "#B0C3D9",
  "Mil-Spec Grade 🔵": "#4B69FF",
  "Restricted 🟣": "#8847FF",
  "Classified 🩷": "#D32CE6",
  "Covert 🔴": "#EB4B4B",
  "★ Couteau 🔪": "#FFD700",
  "★ Gants 🧤": "#FFD700",
  "👑 ZiziTraillette 🌟": "#FFD23F",
};

// L'objet blague ZiziTraillette n'a pas de "valeur estimée" -- il n'a pas de prix.
function formatPrice(price: number | null, rarity: string): string {
  if (rarity === "👑 ZiziTraillette 🌟") return "Objet unique";
  return price != null ? `${price.toFixed(2)} $` : "—";
}

function formatSkinLabel(item: InventoryRow) {
  const prefix =
    item.condition_type === "StatTrak" ? "StatTrak™ " : item.condition_type === "Souvenir" ? "Souvenir " : "";
  return `${prefix}${item.weapon ? `${item.weapon} | ` : ""}${item.skin_name}`;
}

export default function InventoryClient({ items }: { items: InventoryRow[] }) {
  const [selected, setSelected] = useState<InventoryRow | null>(null);

  // Fermer avec Échap, pratique une fois la carte grande ouverte.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((item) => {
          const color = RARITY_COLORS[item.rarity] ?? "#666";
          return (
            <button
              key={item.rowid}
              onClick={() => setSelected(item)}
              className="equip-card btn-anim"
              style={{
                background: PANEL,
                border: `1px solid ${color}55`,
                borderTop: `3px solid ${color}`,
                borderRadius: 8,
                padding: 12,
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                backdropFilter: "blur(4px)",
                boxShadow: `0 0 0 rgba(0,0,0,0)`,
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
              <div style={{ fontSize: 13, opacity: 0.75, color: "#ddd" }}>{item.weapon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#fff" }}>
                {item.condition_type === "StatTrak" ? "StatTrak™ " : ""}
                {item.condition_type === "Souvenir" ? "Souvenir " : ""}
                {item.skin_name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, color: "#ccc" }}>{item.wear_state}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
                <span style={{ color }}>{item.rarity}</span>
                <span style={{ color: "#fff" }}>{formatPrice(item.price, item.rarity)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          role="dialog"
          className="modal-overlay"
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              background: PANEL,
              border: `1px solid ${(RARITY_COLORS[selected.rarity] ?? "#666") + "99"}`,
              borderRadius: 18,
              padding: "32px 28px",
              maxWidth: 440,
              width: "100%",
              textAlign: "center",
              boxShadow: `0 0 70px ${(RARITY_COLORS[selected.rarity] ?? "#fff") + "55"}`,
            }}
          >
            {selected.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image_url}
                alt={selected.skin_name}
                style={{ width: "100%", maxHeight: 220, objectFit: "contain", marginBottom: 14 }}
              />
            )}
            <p style={{ fontSize: 12, opacity: 0.7, color: "#ccc", marginBottom: 4 }}>{selected.weapon}</p>
            <p style={{ fontWeight: 700, fontSize: 19, margin: "2px 0 6px", color: "#fff" }}>
              {formatSkinLabel(selected)}
            </p>
            <p style={{ fontSize: 13, opacity: 0.75, color: "#ddd" }}>{selected.wear_state}</p>
            <p
              style={{
                color: RARITY_COLORS[selected.rarity] ?? "#fff",
                fontWeight: 600,
                marginTop: 8,
                fontSize: 14,
              }}
            >
              {selected.rarity}
            </p>
            <p style={{ fontSize: 15, marginTop: 10, color: "#FFD778", fontWeight: 700 }}>
              {formatPrice(selected.price, selected.rarity)}
            </p>

            <button
              onClick={() => setSelected(null)}
              className="btn-anim"
              style={{
                marginTop: 22,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ccc",
                padding: "10px 22px",
                borderRadius: 10,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
