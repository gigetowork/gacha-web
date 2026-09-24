"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type InventoryItem = {
  rowid: number;
  skin_name: string;
  rarity: string;
  condition_type: string | null;
  wear_state: string | null;
  price: number | null;
  image_url: string | null;
  weapon: string | null;
};

export type ShowcaseSlot = InventoryItem & { slot: number };

const SHOWCASE_SLOTS = 3;
const PANEL = "rgba(22,27,34,0.9)";
const BORDER = "rgba(255,255,255,0.14)";
const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";

const RARITY_COLORS: Record<string, string> = {
  "Industrial Grade ⚪": "#B0C3D9",
  "Mil-Spec Grade 🔵": "#4B69FF",
  "Restricted 🟣": "#8847FF",
  "Classified 🩷": "#D32CE6",
  "Covert 🔴": "#EB4B4B",
  "★ Couteau 🔪": "#FFD700",
  "★ Gants 🧤": "#FFD700",
};

function formatSkinLabel(item: Pick<InventoryItem, "weapon" | "skin_name" | "condition_type">) {
  const prefix =
    item.condition_type === "StatTrak" ? "StatTrak™ " : item.condition_type === "Souvenir" ? "Souvenir " : "";
  return `${prefix}${item.weapon ? `${item.weapon} | ` : ""}${item.skin_name}`;
}

// Catégories construites à partir des VRAIES données du joueur (jamais la liste complète des
// armes CS2 -- le bot ne gère que AK-47 / AWP / couteaux / gants, donc c'est tout ce qu'on propose
// ici). "Couteaux" et "Gants" se reconnaissent par la rareté (★ Couteau / ★ Gants), le reste par
// le nom de l'arme.
function categoryOf(item: InventoryItem): string {
  if (item.rarity === "★ Couteau 🔪") return "Couteaux";
  if (item.rarity === "★ Gants 🧤") return "Gants";
  return item.weapon || "Autre";
}

export default function EquipmentClient({
  initialInventory,
  initialSlots,
}: {
  initialInventory: InventoryItem[];
  initialSlots: (ShowcaseSlot | null)[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<(ShowcaseSlot | null)[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [category, setCategory] = useState<string>("Tous");
  const [busyRowid, setBusyRowid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of initialInventory) set.add(categoryOf(item));
    return ["Tous", ...Array.from(set).sort()];
  }, [initialInventory]);

  const filteredInventory = useMemo(() => {
    if (category === "Tous") return initialInventory;
    return initialInventory.filter((item) => categoryOf(item) === category);
  }, [initialInventory, category]);

  const equippedRowids = useMemo(() => {
    const map = new Map<number, number>(); // rowid -> slot
    for (const s of slots) if (s) map.set(s.rowid, s.slot);
    return map;
  }, [slots]);

  async function equip(item: InventoryItem) {
    setError(null);
    setBusyRowid(item.rowid);
    try {
      const res = await fetch("/api/vitrine/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowid: item.rowid, slot: selectedSlot ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "showcase_full") {
          setError("🖼️ Ta vitrine est pleine (3/3) — choisis un slot à écraser ci-dessus, ou vide-en un.");
        } else if (data.error === "item_not_owned") {
          setError("❌ Cet objet ne t'appartient plus (vendu ou échangé ?).");
        } else {
          setError("Une erreur est survenue, réessaie.");
        }
        return;
      }
      const targetSlot: number = data.slot;
      setSlots((prev) => {
        const next = [...prev];
        // Un skin ne peut occuper qu'un slot à la fois côté affichage ici : si déjà équipé
        // ailleurs, on le retire visuellement de son ancien slot.
        for (let i = 0; i < next.length; i++) {
          if (next[i]?.rowid === item.rowid && next[i]?.slot !== targetSlot) next[i] = null;
        }
        next[targetSlot - 1] = { ...item, slot: targetSlot };
        return next;
      });
      setSelectedSlot(null);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
    } finally {
      setBusyRowid(null);
    }
  }

  async function clearSlot(slot: number) {
    setError(null);
    try {
      const res = await fetch("/api/vitrine/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      if (!res.ok) {
        setError("Une erreur est survenue, réessaie.");
        return;
      }
      setSlots((prev) => {
        const next = [...prev];
        next[slot - 1] = null;
        return next;
      });
      if (selectedSlot === slot) setSelectedSlot(null);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
    }
  }

  return (
    <div>
      {/* Vitrine : 3 emplacements, identiques à !vitrine sur Discord. */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${SHOWCASE_SLOTS}, 1fr)`, gap: 16, marginBottom: 12 }}>
        {slots.map((item, i) => {
          const slotNum = i + 1;
          const isSelected = selectedSlot === slotNum;
          const color = item ? RARITY_COLORS[item.rarity] ?? "#888" : "#888";
          return (
            <div
              key={slotNum}
              className="equip-slot"
              onClick={() => setSelectedSlot(isSelected ? null : slotNum)}
              style={{
                position: "relative",
                background: PANEL,
                border: `2px solid ${isSelected ? GOLD_LIGHT : item ? color + "88" : BORDER}`,
                borderRadius: 14,
                minHeight: 150,
                padding: 14,
                cursor: "pointer",
                boxShadow: isSelected
                  ? `0 0 22px ${GOLD_LIGHT}66`
                  : item
                  ? `0 0 16px ${color}33`
                  : "none",
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 10,
                  fontSize: 10,
                  letterSpacing: 0.6,
                  opacity: 0.6,
                  color: "#fff",
                }}
              >
                SLOT {slotNum}
              </div>

              {item ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSlot(slotNum);
                    }}
                    title="Vider ce slot"
                    className="btn-anim"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                      lineHeight: "22px",
                    }}
                  >
                    ×
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10 }}>
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.skin_name}
                        style={{ width: "100%", height: 64, objectFit: "contain" }}
                      />
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", textAlign: "center", marginTop: 6 }}>
                      {formatSkinLabel(item)}
                    </div>
                    <div style={{ fontSize: 10, color, marginTop: 3 }}>{item.rarity}</div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    minHeight: 110,
                    color: "#aaa",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {isSelected ? "Choisis un skin ci-dessous ↓" : "+ Emplacement vide"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "#ccc", opacity: 0.8, marginBottom: 26 }}>
        {selectedSlot
          ? `Slot ${selectedSlot} sélectionné — clique "Équiper" sur un skin ci-dessous pour l'y placer.`
          : "Clique un emplacement pour cibler un slot précis, ou équipe directement (premier slot libre)."}
      </p>

      {error && <p style={{ color: "#F87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {/* Filtres par catégorie -- uniquement celles réellement présentes dans l'inventaire. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="hud-tab"
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              cursor: "pointer",
              color: category === cat ? "#12161c" : "#eee",
              background:
                category === cat ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})` : "rgba(13,17,23,0.55)",
              border: category === cat ? "none" : `1px solid ${BORDER}`,
              backdropFilter: "blur(6px)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredInventory.length === 0 ? (
        <p style={{ opacity: 0.7, color: "#ddd", fontSize: 13 }}>Aucun skin dans cette catégorie.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 14,
          }}
        >
          {filteredInventory.map((item) => {
            const color = RARITY_COLORS[item.rarity] ?? "#888";
            const equippedSlot = equippedRowids.get(item.rowid);
            const busy = busyRowid === item.rowid;
            return (
              <div
                key={item.rowid}
                className="equip-card"
                style={{
                  background: PANEL,
                  border: `1px solid ${color}55`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: 12,
                  backdropFilter: "blur(4px)",
                }}
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.skin_name}
                    style={{ width: "100%", height: 90, objectFit: "contain", marginBottom: 8 }}
                  />
                )}
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", minHeight: 34 }}>
                  {formatSkinLabel(item)}
                </div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{item.wear_state}</div>
                <div style={{ fontSize: 11, color, marginTop: 4 }}>{item.rarity}</div>

                <button
                  onClick={() => equip(item)}
                  disabled={busy}
                  className="btn-anim"
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "7px 0",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: busy ? "default" : "pointer",
                    color: equippedSlot ? "#12161c" : "#fff",
                    background: equippedSlot
                      ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`
                      : "rgba(255,255,255,0.12)",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? "…" : equippedSlot ? `✓ Slot ${equippedSlot}` : "Équiper"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
