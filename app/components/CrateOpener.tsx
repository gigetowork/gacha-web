"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CASES, FREE_CASE, RARITY_COLORS, type CaseConfig } from "@/lib/caisses";

const PANEL = "#161b22";
const BORDER = "#2a313c";

type OpenResult = {
  duplicate: boolean;
  xpGain: number;
  coins: number;
  caseName: string;
  skin: { name: string; weapon: string };
  rarity: string;
  wear: string;
  variant: string;
  price: number;
  image: string;
};

function formatSkinLabel(weapon: string, name: string, variant: string) {
  if (variant === "StatTrak") return `StatTrak™ ${weapon} | ${name}`;
  if (variant === "Souvenir") return `Souvenir ${weapon} | ${name}`;
  return `${weapon} | ${name}`;
}

export default function CrateOpener({
  isAuthenticated,
  freeCaseAvailable,
}: {
  isAuthenticated: boolean;
  freeCaseAvailable: boolean;
}) {
  const router = useRouter();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allCrates: CaseConfig[] = [FREE_CASE, ...CASES];

  async function openCase(caseConfig: CaseConfig) {
    if (!isAuthenticated) {
      setError("Connecte-toi avec Discord pour ouvrir une caisse.");
      return;
    }
    setError(null);
    setOpeningKey(caseConfig.key);
    try {
      const res = await fetch("/api/caisses/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseKey: caseConfig.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_funds") {
          setError(`⚠️ Il te faut ${caseConfig.price} 🪙 pour la ${caseConfig.name} (solde insuffisant).`);
        } else if (data.error === "free_case_already_claimed") {
          setError("🎁 Tu as déjà réclamé ta caisse gratuite aujourd'hui, reviens demain !");
        } else if (data.error === "not_authenticated") {
          setError("Connecte-toi avec Discord pour ouvrir une caisse.");
        } else {
          setError("Une erreur est survenue, réessaie.");
        }
        return;
      }
      // Petit suspense avant la révélation, pour que ça ne paraisse pas instantané/plat.
      await new Promise((r) => setTimeout(r, 900));
      setResult(data as OpenResult);
      router.refresh(); // recharge les données serveur (solde affiché dans la barre du haut, etc.)
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
    } finally {
      setOpeningKey(null);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
        }}
      >
        {allCrates.map((crate) => {
          const isFree = !!crate.free;
          const disabled = openingKey !== null || (isFree && !freeCaseAvailable);
          return (
            <button
              key={crate.key}
              onClick={() => openCase(crate)}
              disabled={disabled}
              className="crate-card btn-anim"
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderTop: `3px solid ${crate.color}`,
                borderRadius: 14,
                padding: "22px 12px",
                textAlign: "center",
                boxShadow: `0 0 24px ${crate.color}33`,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled && !openingKey ? 0.45 : 1,
                color: "inherit",
                font: "inherit",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{isFree ? "🎁" : "📦"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: crate.color }}>
                {(isFree ? "Gratuite" : crate.name.replace("Caisse ", "")).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {openingKey === crate.key
                  ? "Ouverture…"
                  : isFree
                  ? freeCaseAvailable
                    ? "GRATUITE"
                    : "Déjà réclamée"
                  : `🪙 ${crate.price.toLocaleString("fr-FR")}`}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ textAlign: "center", color: "#F87171", fontSize: 13, marginTop: 18 }}>{error}</p>
      )}

      {!isAuthenticated && !error && (
        <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, marginTop: 24 }}>
          Connecte-toi avec Discord pour ouvrir une caisse.
        </p>
      )}

      {result && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => setResult(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: PANEL,
              border: `1px solid ${RARITY_COLORS[result.rarity] ?? BORDER}`,
              borderRadius: 16,
              padding: "32px 28px",
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
              boxShadow: `0 0 60px ${(RARITY_COLORS[result.rarity] ?? "#fff") + "55"}`,
            }}
          >
            <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{result.caseName}</p>
            {result.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.image}
                alt={result.skin.name}
                style={{ width: "100%", maxHeight: 160, objectFit: "contain", margin: "12px 0" }}
              />
            )}
            <p style={{ fontWeight: 700, fontSize: 16, margin: "8px 0 2px" }}>
              {formatSkinLabel(result.skin.weapon, result.skin.name, result.variant)}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>{result.wear}</p>
            <p style={{ color: RARITY_COLORS[result.rarity] ?? "#fff", fontWeight: 600, marginTop: 6 }}>
              {result.rarity}
            </p>
            <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Valeur estimée : {result.price.toFixed(2)} $</p>

            {result.duplicate ? (
              <p style={{ marginTop: 14, fontSize: 13, color: "#FFD778" }}>
                ♻️ Doublon ! Convertie en <strong>+{result.xpGain} XP</strong>.
              </p>
            ) : (
              <p style={{ marginTop: 14, fontSize: 13, color: "#4ade80" }}>✅ Ajoutée à ton inventaire</p>
            )}

            <button
              onClick={() => setResult(null)}
              className="btn-anim"
              style={{
                marginTop: 20,
                background: "transparent",
                border: `1px solid ${BORDER}`,
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
    </div>
  );
}
