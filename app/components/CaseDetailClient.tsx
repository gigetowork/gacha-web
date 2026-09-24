"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RARITY_COLORS, type CaseConfig } from "@/lib/caisses";
import CaseReel, { type ReelItem } from "./CaseReel";

const PANEL = "rgba(22,27,34,0.92)";
const BORDER = "rgba(255,255,255,0.14)";

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

export default function CaseDetailClient({
  caseConfig,
  odds,
  isAuthenticated,
  coins,
  freeCaseAvailable,
}: {
  caseConfig: CaseConfig;
  odds: { rarity: string; pct: number }[];
  isAuthenticated: boolean;
  coins: number;
  freeCaseAvailable: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [pending, setPending] = useState<OpenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveCoins, setLiveCoins] = useState(coins);
  const [liveFreeAvailable, setLiveFreeAvailable] = useState(freeCaseAvailable);
  const [opening, setOpening] = useState(false);

  const isFree = !!caseConfig.free;
  const canOpen = isAuthenticated && (isFree ? liveFreeAvailable : liveCoins >= caseConfig.price);

  async function openCase() {
    if (!isAuthenticated) {
      setError("Connecte-toi avec Discord pour ouvrir cette caisse.");
      return;
    }
    setError(null);
    setOpening(true);
    try {
      const res = await fetch("/api/caisses/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseKey: caseConfig.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_funds") setError(`⚠️ Il te faut ${caseConfig.price} 🪙 (solde insuffisant).`);
        else if (data.error === "free_case_already_claimed")
          setError("🎁 Tu as déjà réclamé ta caisse gratuite aujourd'hui, reviens demain !");
        else if (data.error === "not_authenticated") setError("Connecte-toi avec Discord pour ouvrir cette caisse.");
        else setError("Une erreur est survenue, réessaie.");
        setOpening(false);
        return;
      }
      setPending(data as OpenResult);
      setPhase("spinning");
      if (isFree) setLiveFreeAvailable(false);
      else setLiveCoins((c) => c - caseConfig.price);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
      setOpening(false);
    }
  }

  function handleReelDone() {
    setPhase("result");
    setOpening(false);
    if (pending) setLiveCoins(pending.coins);
  }

  function reset() {
    setPhase("idle");
    setPending(null);
  }

  return (
    <div>
      <div
        style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderTop: `3px solid ${caseConfig.color}`,
          borderRadius: 20,
          padding: "32px 28px",
          backdropFilter: "blur(6px)",
          boxShadow: `0 0 50px ${caseConfig.color}22`,
        }}
      >
        {phase === "idle" && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ color: "#fff", fontSize: 24, margin: "0 0 4px", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
              {caseConfig.name}
            </h1>
            <p style={{ color: caseConfig.color, fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              {isFree ? (liveFreeAvailable ? "Gratuite" : "Déjà réclamée aujourd'hui") : `🪙 ${caseConfig.price.toLocaleString("fr-FR")}`}
            </p>

            <div className="case-float" style={{ display: "inline-block", filter: `drop-shadow(0 0 30px ${caseConfig.color}88)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={caseConfig.image} alt={caseConfig.name} style={{ width: "100%", maxWidth: 320, height: "auto" }} />
            </div>

            {error && <p style={{ color: "#F87171", fontSize: 13, margin: "16px 0 0" }}>{error}</p>}

            <div style={{ marginTop: 24 }}>
              <button
                onClick={openCase}
                disabled={!canOpen || opening}
                className="btn-anim"
                style={{
                  padding: "14px 40px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: 0.4,
                  cursor: !canOpen || opening ? "default" : "pointer",
                  color: "#12161c",
                  background: canOpen
                    ? `linear-gradient(90deg, ${caseConfig.color}, #fff8)`
                    : "rgba(255,255,255,0.12)",
                  opacity: !canOpen || opening ? 0.55 : 1,
                  boxShadow: canOpen ? `0 6px 26px ${caseConfig.color}55` : "none",
                }}
              >
                {opening
                  ? "Ouverture…"
                  : !isAuthenticated
                  ? "Connecte-toi pour ouvrir"
                  : isFree
                  ? liveFreeAvailable
                    ? "🎁 Ouvrir gratuitement"
                    : "Déjà réclamée"
                  : liveCoins < caseConfig.price
                  ? "Solde insuffisant"
                  : "Ouvrir la caisse"}
              </button>
            </div>
          </div>
        )}

        {phase === "spinning" && pending && (
          <div>
            <p style={{ textAlign: "center", fontSize: 13, opacity: 0.6, color: "#ddd", marginBottom: 16 }}>
              {pending.caseName}
            </p>
            <CaseReel items={pending.reel} winIndex={pending.winIndex} onDone={handleReelDone} big />
            <p style={{ textAlign: "center", fontSize: 12, opacity: 0.5, color: "#ccc", marginTop: 16 }}>
              Ouverture en cours…
            </p>
          </div>
        )}

        {phase === "result" && pending && (
          <div style={{ textAlign: "center" }}>
            {pending.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pending.image}
                alt={pending.skin.name}
                style={{ width: "100%", maxHeight: 220, objectFit: "contain", margin: "4px 0 14px" }}
              />
            )}
            <p style={{ fontWeight: 700, fontSize: 20, margin: "8px 0 2px", color: "#fff" }}>
              {formatSkinLabel(pending.skin.weapon, pending.skin.name, pending.variant)}
            </p>
            <p style={{ fontSize: 13, opacity: 0.7, color: "#ccc" }}>{pending.wear}</p>
            <p style={{ color: RARITY_COLORS[pending.rarity] ?? "#fff", fontWeight: 700, marginTop: 8, fontSize: 15 }}>
              {pending.rarity}
            </p>
            <p style={{ fontSize: 14, opacity: 0.85, color: "#ddd", marginTop: 4 }}>
              Valeur estimée : {pending.price.toFixed(2)} $
            </p>

            {pending.duplicate ? (
              <p style={{ marginTop: 16, fontSize: 14, color: "#FFD778" }}>
                ♻️ Doublon ! Convertie en <strong>+{pending.xpGain} XP</strong>.
              </p>
            ) : (
              <p style={{ marginTop: 16, fontSize: 14, color: "#4ade80" }}>✅ Ajoutée à ton inventaire</p>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 26 }}>
              <button
                onClick={reset}
                disabled={!canOpen}
                className="btn-anim"
                style={{
                  padding: "12px 26px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: canOpen ? "pointer" : "default",
                  color: "#12161c",
                  background: canOpen ? `linear-gradient(90deg, ${caseConfig.color}, #fff8)` : "rgba(255,255,255,0.12)",
                  opacity: canOpen ? 1 : 0.5,
                }}
              >
                Rouvrir
              </button>
              <Link
                href="/inventaire"
                className="btn-anim"
                style={{
                  padding: "12px 26px",
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  fontSize: 14,
                  color: "#ddd",
                  textDecoration: "none",
                }}
              >
                Voir mon inventaire
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Probabilités réelles de cette caisse (mêmes poids que le tirage server-side). */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ color: "#fff", fontSize: 16, marginBottom: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
          🎲 Probabilités de drop
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {odds.map(({ rarity, pct }) => {
            const color = RARITY_COLORS[rarity] ?? "#888";
            return (
              <div key={rarity}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color }}>{rarity}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{pct.toFixed(2)} %</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      boxShadow: `0 0 10px ${color}88`,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
