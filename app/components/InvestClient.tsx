"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INVEST_DURATION_SECONDS,
  INVEST_MIN_AMOUNT,
  INVEST_RETURN_MAX,
  INVEST_RETURN_MIN,
} from "@/lib/invest";

export type InvestmentRow = {
  invest_id: number;
  user_id: string;
  amount: number;
  channel_id: string | null;
  start_ts: number;
  end_ts: number;
  status: "active" | "done";
  payout: number | null;
};

const PANEL = "rgba(22,27,34,0.9)";
const BORDER = "rgba(255,255,255,0.14)";
const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";
const GREEN = "#4ade80";

const RING_SIZE = 220;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function fmt(n: number) {
  return n.toLocaleString("fr-FR");
}

// Composant "carte-stat" réutilisée pour le rang de chiffres en haut de page.
function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "14px 16px",
        backdropFilter: "blur(4px)",
        flex: "1 1 140px",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65, color: "#ddd", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color ?? "#fff", marginTop: 2 }}>{value}</div>
    </div>
  );
}

type Confetto = { id: number; left: number; delay: number; duration: number; color: string; rotate: number };

function spawnConfetti(): Confetto[] {
  const colors = [GOLD, GOLD_LIGHT, GREEN, "#3FD0E0", "#EB4B4B"];
  return Array.from({ length: 42 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 1.6 + Math.random() * 1.1,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
  }));
}

export default function InvestClient({
  coins,
  initialActive,
  history,
  stats,
  vault,
}: {
  coins: number;
  initialActive: InvestmentRow | null;
  history: InvestmentRow[];
  stats: { totalInvested: number; totalProfit: number; countDone: number; bestPct: number | null };
  vault: { total: number; players: number };
}) {
  const router = useRouter();
  const [active, setActive] = useState<InvestmentRow | null>(initialActive);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const [amountInput, setAmountInput] = useState(String(Math.max(INVEST_MIN_AMOUNT, 100)));
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCoins, setLiveCoins] = useState(coins);

  const [reveal, setReveal] = useState<{ amount: number; payout: number; profit: number } | null>(null);
  const [confetti, setConfetti] = useState<Confetto[]>([]);
  const [counterValue, setCounterValue] = useState(0);
  const [localHistory, setLocalHistory] = useState<InvestmentRow[]>(history);

  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vérifie côté serveur si l'investissement en cours est arrivé à échéance -- même logique
  // atomique que finish_investment() dans bot.py, donc jamais payé deux fois même si le bot ET
  // le site vérifient en même temps.
  async function checkStatus() {
    try {
      const res = await fetch("/api/investir/status", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setLiveCoins(data.coins);
      if (data.resolved) {
        triggerReveal(data.resolved);
      }
      setActive(data.active ?? null);
    } catch {
      // silencieux -- on retentera au prochain tick
    }
  }

  function triggerReveal(result: { amount: number; payout: number; profit: number }) {
    setReveal(result);
    setConfetti(spawnConfetti());
    setCounterValue(result.amount);

    const startTime = performance.now();
    const DURATION = 1300;
    function step(t: number) {
      const p = Math.min(1, (t - startTime) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setCounterValue(Math.round(result.amount + (result.payout - result.amount) * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    setLocalHistory((prev) => [
      {
        invest_id: -Date.now(),
        user_id: "",
        amount: result.amount,
        channel_id: null,
        start_ts: Date.now() / 1000 - INVEST_DURATION_SECONDS,
        end_ts: Date.now() / 1000,
        status: "done",
        payout: result.payout,
      },
      ...prev,
    ]);
  }

  // Horloge locale (1 tick/s) pour l'anneau de progression + le compte à rebours -- purement
  // visuel, ne déclenche aucune écriture. La vraie résolution passe toujours par checkStatus().
  useEffect(() => {
    tickInterval.current = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
    };
  }, []);

  // Vérifie l'état au chargement (au cas où l'échéance serait déjà passée), puis programme une
  // vérification pile au bon moment, plus un filet de sécurité toutes les 20s tant qu'un
  // investissement est actif (utile si l'onglet a été mis en veille).
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant qu'un investissement est actif : un check "au bon moment" (pile à l'échéance) + un
  // filet de sécurité toutes les 5s (utile si l'onglet était en veille et a raté le premier).
  // Dépend uniquement de l'identité de l'investissement (pas de `now`, sinon ce timer serait
  // recréé -- et donc jamais laissé le temps de se déclencher -- à chaque tick de l'horloge).
  useEffect(() => {
    if (pollTimeout.current) clearTimeout(pollTimeout.current);
    if (!active) return;
    const remainingMs = active.end_ts * 1000 - Date.now();
    pollTimeout.current = setTimeout(checkStatus, Math.max(500, remainingMs + 800));

    const safetyInterval = setInterval(checkStatus, 5000);
    return () => {
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
      clearInterval(safetyInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.invest_id, active?.end_ts]);

  const progress = useMemo(() => {
    if (!active) return 0;
    const total = active.end_ts - active.start_ts;
    const done = now - active.start_ts;
    return Math.max(0, Math.min(1, total > 0 ? done / total : 0));
  }, [active, now]);

  const remainingSeconds = active ? Math.max(0, Math.round(active.end_ts - now)) : 0;
  const remainingLabel = useMemo(() => {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Jauge de rendement affichée PENDANT l'attente : oscille dans la vraie fourchette garantie
  // (10%-20%) sans jamais prétendre connaître le résultat réel -- il n'est tiré qu'à l'échéance,
  // côté serveur (voir /api/investir/status). Purement décoratif, jamais utilisé pour le calcul.
  const oscillatingPct = useMemo(() => {
    const mid = (INVEST_RETURN_MIN + INVEST_RETURN_MAX) / 2;
    const amp = (INVEST_RETURN_MAX - INVEST_RETURN_MIN) / 2;
    return mid + amp * Math.sin(now * 1.3);
  }, [now]);

  async function placeInvestment() {
    setError(null);
    const montant = parseInt(amountInput, 10);
    if (!Number.isFinite(montant) || montant < INVEST_MIN_AMOUNT) {
      setError(`Le montant minimum est de ${INVEST_MIN_AMOUNT} 🪙.`);
      return;
    }
    if (montant > liveCoins) {
      setError("Solde insuffisant.");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/investir/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_funds") setError("Solde insuffisant.");
        else if (data.error === "already_active") setError("Tu as déjà un investissement en cours.");
        else if (data.error === "invalid_amount") setError(`Montant minimum : ${INVEST_MIN_AMOUNT} 🪙.`);
        else setError("Une erreur est survenue, réessaie.");
        return;
      }
      setActive(data.active);
      setLiveCoins((c) => c - montant);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur, réessaie.");
    } finally {
      setPlacing(false);
    }
  }

  function closeReveal() {
    setReveal(null);
    setConfetti([]);
    router.refresh();
  }

  const maxHistoryProfit = Math.max(1, ...localHistory.map((h) => (h.payout ?? h.amount) - h.amount));

  return (
    <div>
      {/* Rangée de stats -- toutes calculées depuis de vraies données (aucun chiffre inventé). */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
        <StatTile label="SOLDE" value={`${fmt(liveCoins)} 🪙`} color={GOLD_LIGHT} />
        <StatTile label="TOTAL INVESTI (à vie)" value={`${fmt(stats.totalInvested)} 🪙`} />
        <StatTile label="PROFIT CUMULÉ" value={`+${fmt(stats.totalProfit)} 🪙`} color={GREEN} />
        <StatTile
          label="MEILLEUR RENDEMENT"
          value={stats.bestPct != null ? `+${(stats.bestPct * 100).toFixed(1)} %` : "—"}
        />
        <StatTile
          label="COFFRE COMMUN (en cours)"
          value={`${fmt(vault.total)} 🪙 · ${vault.players} joueur${vault.players > 1 ? "s" : ""}`}
        />
      </div>

      {error && <p style={{ color: "#F87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {/* Carte principale : formulaire de placement, ou suivi en direct si un investissement tourne. */}
      <div
        style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          padding: 28,
          marginBottom: 34,
          backdropFilter: "blur(6px)",
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {active ? (
          <>
            <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={RING_STROKE}
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={GOLD_LIGHT}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 0.9s linear", filter: `drop-shadow(0 0 8px ${GOLD_LIGHT}88)` }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, color: "#ddd", letterSpacing: 0.5 }}>RETOUR DANS</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                  {remainingLabel}
                </div>
                <div style={{ fontSize: 12, color: GOLD_LIGHT, marginTop: 4 }}>{fmt(active.amount)} 🪙 investis</div>
              </div>
            </div>

            <div style={{ minWidth: 220 }}>
              <p style={{ fontSize: 12, opacity: 0.65, color: "#ddd", marginBottom: 10, maxWidth: 260 }}>
                Rendement garanti entre +10% et +20%, tiré au sort à l'échéance. La jauge ci-dessous oscille dans
                cette fourchette — le vrai résultat n'est connu qu'à la fin.
              </p>
              <div
                style={{
                  position: "relative",
                  height: 14,
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${((oscillatingPct - INVEST_RETURN_MIN) / (INVEST_RETURN_MAX - INVEST_RETURN_MIN)) * 100}%`,
                    background: `linear-gradient(90deg, ${GOLD}, ${GREEN})`,
                    transition: "width 0.25s linear",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", marginTop: 4 }}>
                <span>+10%</span>
                <span>+20%</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ width: "100%", maxWidth: 420 }}>
            <label style={{ fontSize: 12, opacity: 0.7, color: "#ddd", display: "block", marginBottom: 8 }}>
              Montant à investir (min. {INVEST_MIN_AMOUNT} 🪙, solde : {fmt(liveCoins)} 🪙)
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="number"
                min={INVEST_MIN_AMOUNT}
                max={liveCoins}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontSize: 15,
                }}
              />
              <button
                onClick={placeInvestment}
                disabled={placing}
                className="btn-anim"
                style={{
                  padding: "0 24px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: placing ? "default" : "pointer",
                  color: "#12161c",
                  background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                  opacity: placing ? 0.6 : 1,
                }}
              >
                {placing ? "…" : "Investir"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmountInput(String(v))}
                  className="btn-anim"
                  style={{
                    fontSize: 11,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: `1px solid ${BORDER}`,
                    background: "rgba(255,255,255,0.06)",
                    color: "#ddd",
                    cursor: "pointer",
                  }}
                >
                  {v} 🪙
                </button>
              ))}
              <button
                onClick={() => setAmountInput(String(liveCoins))}
                className="btn-anim"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.06)",
                  color: "#ddd",
                  cursor: "pointer",
                }}
              >
                Max
              </button>
            </div>

            {(() => {
              const m = parseInt(amountInput, 10);
              if (!Number.isFinite(m) || m <= 0) return null;
              return (
                <p style={{ fontSize: 12, color: "#ccc", marginTop: 14 }}>
                  Gain potentiel dans 1h : entre{" "}
                  <strong style={{ color: GREEN }}>{fmt(Math.round(m * (1 + INVEST_RETURN_MIN)))} 🪙</strong> et{" "}
                  <strong style={{ color: GREEN }}>{fmt(Math.round(m * (1 + INVEST_RETURN_MAX)))} 🪙</strong>.
                </p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Historique + mini graphique de profit réalisé -- toutes des vraies lignes de la table
          `investments`. */}
      <h2 style={{ color: "#fff", fontSize: 16, marginBottom: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
        📜 Historique
      </h2>
      {localHistory.length === 0 ? (
        <p style={{ opacity: 0.6, color: "#ddd", fontSize: 13 }}>
          Aucun investissement terminé pour l'instant — place ta première mise ci-dessus !
        </p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 70,
              marginBottom: 18,
              padding: "0 4px",
            }}
          >
            {[...localHistory]
              .slice(0, 24)
              .reverse()
              .map((h, i) => {
                const profit = (h.payout ?? h.amount) - h.amount;
                const heightPct = Math.max(6, (profit / maxHistoryProfit) * 100);
                return (
                  <div
                    key={h.invest_id ?? i}
                    title={`+${profit} 🪙`}
                    style={{
                      flex: 1,
                      height: `${heightPct}%`,
                      background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GREEN})`,
                      borderRadius: "4px 4px 0 0",
                      minWidth: 4,
                      transition: "height 0.4s ease",
                    }}
                  />
                );
              })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localHistory.map((h) => {
              const profit = (h.payout ?? h.amount) - h.amount;
              const pct = h.amount > 0 ? (profit / h.amount) * 100 : 0;
              return (
                <div
                  key={h.invest_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    fontSize: 13,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <span style={{ color: "#ddd" }}>{fmt(h.amount)} 🪙 investis</span>
                  <span style={{ color: GREEN, fontWeight: 600 }}>
                    +{fmt(profit)} 🪙 ({pct.toFixed(1)}%)
                  </span>
                  <span style={{ color: "#888", fontSize: 12 }}>
                    {new Date(h.end_ts * 1000).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Révélation du résultat : compteur qui remonte de la mise vers le paiement, + confettis. */}
      {reveal && (
        <div
          role="dialog"
          className="modal-overlay"
          onClick={closeReveal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 20,
            overflow: "hidden",
          }}
        >
          {confetti.map((c) => (
            <div
              key={c.id}
              style={{
                position: "absolute",
                top: -20,
                left: `${c.left}%`,
                width: 8,
                height: 14,
                background: c.color,
                borderRadius: 2,
                animation: `confettiFall ${c.duration}s ease-in ${c.delay}s forwards`,
                transform: `rotate(${c.rotate}deg)`,
                zIndex: 61,
              }}
            />
          ))}

          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              background: PANEL,
              border: `1px solid ${GREEN}99`,
              borderRadius: 18,
              padding: "34px 30px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: `0 0 70px ${GREEN}55`,
              zIndex: 62,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 6 }}>📈</div>
            <p style={{ fontSize: 13, opacity: 0.7, color: "#ccc" }}>Investissement arrivé à échéance !</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: GOLD_LIGHT, margin: "10px 0", fontVariantNumeric: "tabular-nums" }}>
              {fmt(counterValue)} 🪙
            </p>
            <p style={{ color: GREEN, fontWeight: 600, fontSize: 15 }}>
              +{fmt(reveal.profit)} 🪙 ({((reveal.profit / reveal.amount) * 100).toFixed(1)}%)
            </p>
            <button
              onClick={closeReveal}
              className="btn-anim"
              style={{
                marginTop: 22,
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
