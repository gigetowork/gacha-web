"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CASES, FREE_CASE, RARITY_COLORS, type CaseConfig } from "@/lib/caisses";
import CaseReel, { type ReelItem } from "./CaseReel";

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
  reel: ReelItem[];
  winIndex: number;
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
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [pending, setPending] = useState<OpenResult | null>(null);
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
        setOpeningKey(null);
        return;
      }
      // Le résultat est déjà acquis côté serveur -> on lance tout de suite le rouleau visuel,
      // qui va défiler puis s'arrêter dessus.
      setPending(data as OpenResult);
      setPhase("spinning");
      router.refresh(); // recharge le solde affiché dans la barre du haut dès maintenant
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
      setOpeningKey(null);
    }
  }

  function handleReelDone() {
    setPhase("result");
    setOpeningKey(null);
  }

  function closeModal() {
    setPhase("idle");
    setPending(null);
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

      {error && <p style={{ textAlign: "center", color: "#F87171", fontSize: 13, marginTop: 18 }}>{error}</p>}

      {!isAuthenticated && !error && (
        <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, marginTop: 24 }}>
          Connecte-toi avec Discord pour ouvrir une caisse.
        </p>
      )}

      {phase !== "idle" && pending && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => phase === "result" && closeModal()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: PANEL,
              border: `1px solid ${phase === "result" ? RARITY_COLORS[pending.rarity] ?? BORDER : BORDER}`,
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow:
                phase === "result" ? `0 0 60px ${(RARITY_COLORS[pending.rarity] ?? "#fff") + "55"}` : "none",
            }}
          >
            <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 14 }}>{pending.caseName}</p>

            {phase === "spinning" && (
              <>
                <CaseReel items={pending.reel} winIndex={pending.winIndex} onDone={handleReelDone} />
                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 16 }}>Ouverture en cours…</p>
              </>
            )}

            {phase === "result" && (
              <>
                {pending.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pending.image}
                    alt={pending.skin.name}
                    style={{ width: "100%", maxHeight: 160, objectFit: "contain", margin: "4px 0 12px" }}
                  />
                )}
                <p style={{ fontWeight: 700, fontSize: 16, margin: "8px 0 2px" }}>
                  {formatSkinLabel(pending.skin.weapon, pending.skin.name, pending.variant)}
                </p>
                <p style={{ fontSize: 12, opacity: 0.7 }}>{pending.wear}</p>
                <p style={{ color: RARITY_COLORS[pending.rarity] ?? "#fff", fontWeight: 600, marginTop: 6 }}>
                  {pending.rarity}
                </p>
                <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  Valeur estimée : {pending.price.toFixed(2)} $
                </p>

                {pending.duplicate ? (
                  <p style={{ marginTop: 14, fontSize: 13, color: "#FFD778" }}>
                    ♻️ Doublon ! Convertie en <strong>+{pending.xpGain} XP</strong>.
                  </p>
                ) : (
                  <p style={{ marginTop: 14, fontSize: 13, color: "#4ade80" }}>✅ Ajoutée à ton inventaire</p>
                )}

                <button
                  onClick={closeModal}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
