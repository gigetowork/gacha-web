"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RARITY_COLORS, formatValue, type CaseConfig } from "@/lib/caisses";
import CaseReel, { type ReelItem } from "./CaseReel";

const PANEL = "rgba(22,27,34,0.92)";
const BORDER = "rgba(255,255,255,0.14)";

type SingleOpen = {
  duplicate: boolean;
  xpGain: number;
  skin: { name: string; weapon: string };
  rarity: string;
  wear: string;
  variant: string;
  price: number;
  image: string;
};

type OpenResult = {
  coins: number;
  caseName: string;
  count: 1 | 5;
  opens: SingleOpen[];
  reel?: ReelItem[];
  winIndex?: number;
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
  // Nombre de caisses à ouvrir d'un coup : x1 (avec l'animation du rouleau) ou x5 (accéléré, sans
  // rouleau -- pensé pour les joueurs qui ont les moyens de claquer plusieurs caisses d'un coup et
  // ne veulent pas attendre 5 animations à la suite). La caisse gratuite reste toujours x1.
  const [openCount, setOpenCount] = useState<1 | 5>(1);

  const isFree = !!caseConfig.free;
  const totalPrice = caseConfig.price * openCount;
  const canOpen = isAuthenticated && (isFree ? liveFreeAvailable : liveCoins >= totalPrice);

  async function openCase(count: 1 | 5) {
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
        body: JSON.stringify({ caseKey: caseConfig.key, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_funds")
          setError(`⚠️ Il te faut ${caseConfig.price * count} 🪙 (solde insuffisant).`);
        else if (data.error === "free_case_already_claimed")
          setError("🎁 Tu as déjà réclamé ta caisse gratuite aujourd'hui, reviens demain !");
        else if (data.error === "not_authenticated") setError("Connecte-toi avec Discord pour ouvrir cette caisse.");
        else setError("Une erreur est survenue, réessaie.");
        setOpening(false);
        return;
      }
      const result = data as OpenResult;
      setPending(result);
      if (isFree) setLiveFreeAvailable(false);
      else setLiveCoins((c) => c - caseConfig.price * count);
      if (result.count === 1) {
        setPhase("spinning");
        // IMPORTANT : ne JAMAIS appeler router.refresh() pendant que le rouleau tourne -- ça force
        // React à re-rendre l'arbre (nouvelles props serveur), ce qui réinitialise le style CSS
        // `transform` du rouleau (posé impérativement via une ref) en plein milieu de l'animation.
        // Ça désynchronise visuellement l'endroit où le rouleau s'arrête du vrai gain déjà acquis
        // côté serveur -- c'était le bug signalé. Le refresh est donc reporté à la fin de
        // l'animation (handleReelDone), où plus rien ne peut être perturbé.
      } else {
        // x5 : pas de rouleau à faire tourner, les 5 résultats s'affichent directement.
        setPhase("result");
        setOpening(false);
        setLiveCoins(result.coins);
        router.refresh();
      }
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
      setOpening(false);
    }
  }

  function handleReelDone() {
    setPhase("result");
    setOpening(false);
    if (pending) setLiveCoins(pending.coins);
    router.refresh();
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
              {isFree
                ? liveFreeAvailable
                  ? "Gratuite"
                  : "Déjà réclamée aujourd'hui"
                : `🪙 ${totalPrice.toLocaleString("fr-FR")}${openCount === 5 ? ` (${caseConfig.price} × 5)` : ""}`}
            </p>

            <div
              className="case-float"
              style={{
                display: "inline-block",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: `0 0 44px ${caseConfig.color}88`,
                border: `1px solid ${caseConfig.color}55`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={caseConfig.image}
                alt={caseConfig.name}
                style={{ width: "100%", maxWidth: 320, height: "auto", display: "block" }}
              />
            </div>

            {error && <p style={{ color: "#F87171", fontSize: 13, margin: "16px 0 0" }}>{error}</p>}

            {/* Sélecteur x1 / x5 -- masqué pour la caisse gratuite (toujours x1, une seule par
                jour). Ouvrir x5 d'un coup accélère les choses pour ceux qui ont assez de pièces
                pour claquer plusieurs caisses sans attendre 5 animations à la suite. */}
            {!isFree && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22 }}>
                {([1, 5] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setOpenCount(n)}
                    disabled={opening}
                    className="btn-anim"
                    style={{
                      padding: "8px 20px",
                      borderRadius: 10,
                      border: `1px solid ${openCount === n ? caseConfig.color : BORDER}`,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: opening ? "default" : "pointer",
                      color: openCount === n ? "#12161c" : "#ddd",
                      background: openCount === n ? caseConfig.color : "rgba(255,255,255,0.06)",
                    }}
                  >
                    {n === 1 ? "Ouvrir x1" : "Ouvrir x5 ⚡"}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => openCase(openCount)}
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
                  : liveCoins < totalPrice
                  ? "Solde insuffisant"
                  : openCount === 5
                  ? "Ouvrir les 5 caisses"
                  : "Ouvrir la caisse"}
              </button>
            </div>
          </div>
        )}

        {phase === "spinning" && pending && pending.reel && pending.winIndex !== undefined && (
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

        {phase === "result" && pending && pending.count === 1 && (
          <div style={{ textAlign: "center" }}>
            {pending.opens[0].image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pending.opens[0].image}
                alt={pending.opens[0].skin.name}
                style={{ width: "100%", maxHeight: 220, objectFit: "contain", margin: "4px 0 14px" }}
              />
            )}
            <p style={{ fontWeight: 700, fontSize: 20, margin: "8px 0 2px", color: "#fff" }}>
              {formatSkinLabel(pending.opens[0].skin.weapon, pending.opens[0].skin.name, pending.opens[0].variant)}
            </p>
            <p style={{ fontSize: 13, opacity: 0.7, color: "#ccc" }}>{pending.opens[0].wear}</p>
            <p
              style={{
                color: RARITY_COLORS[pending.opens[0].rarity] ?? "#fff",
                fontWeight: 700,
                marginTop: 8,
                fontSize: 15,
              }}
            >
              {pending.opens[0].rarity}
            </p>
            <p style={{ fontSize: 14, opacity: 0.85, color: "#ddd", marginTop: 4 }}>
              Valeur estimée : {formatValue(pending.opens[0].price, pending.opens[0].rarity)}
            </p>

            {pending.opens[0].duplicate ? (
              <p style={{ marginTop: 16, fontSize: 14, color: "#FFD778" }}>
                ♻️ Doublon ! Convertie en <strong>+{pending.opens[0].xpGain} XP</strong>.
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

        {phase === "result" && pending && pending.count === 5 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 17, margin: "0 0 16px", color: "#fff" }}>
              📦 5 caisses ouvertes d'un coup !
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
              }}
            >
              {pending.opens.map((open, i) => {
                const color = RARITY_COLORS[open.rarity] ?? "#666";
                return (
                  <div
                    key={i}
                    style={{
                      background: "rgba(13,17,23,0.55)",
                      border: `1px solid ${color}55`,
                      borderBottom: `3px solid ${color}`,
                      borderRadius: 12,
                      padding: 10,
                      position: "relative",
                    }}
                  >
                    {open.duplicate && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: "rgba(255,215,120,0.18)",
                          color: "#FFD778",
                        }}
                      >
                        DOUBLON
                      </span>
                    )}
                    {open.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={open.image}
                        alt={open.skin.name}
                        style={{ width: "100%", height: 80, objectFit: "contain", marginBottom: 6 }}
                      />
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
                      {formatSkinLabel(open.skin.weapon, open.skin.name, open.variant)}
                    </div>
                    <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 4 }}>{open.rarity}</div>
                    <div style={{ fontSize: 10, opacity: 0.75, color: "#ccc", marginTop: 2 }}>
                      {open.duplicate ? `+${open.xpGain} XP` : formatValue(open.price, open.rarity)}
                    </div>
                  </div>
                );
              })}
            </div>

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
