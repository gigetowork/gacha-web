import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import InvestClient, { type InvestmentRow } from "../components/InvestClient";

export default async function InvestissementsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
        <p>Connecte-toi avec Discord pour investir.</p>
        <Link href="/" style={{ color: "#5865F2" }}>
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  const discordId = (session.user as any)?.discordId as string;

  const [coinsRes, activeRes, historyRes, statsRes, poolRes] = await Promise.all([
    pool.query<{ coins: number }>("SELECT coins FROM economy WHERE user_id = $1::bigint", [discordId]),
    pool.query<InvestmentRow>(
      `SELECT invest_id, user_id, amount, channel_id, start_ts, end_ts, status, payout
       FROM investments WHERE user_id = $1::bigint AND status = 'active' LIMIT 1`,
      [discordId]
    ),
    pool.query<InvestmentRow>(
      `SELECT invest_id, user_id, amount, channel_id, start_ts, end_ts, status, payout
       FROM investments WHERE user_id = $1::bigint AND status = 'done'
       ORDER BY end_ts DESC LIMIT 20`,
      [discordId]
    ),
    pool.query<{ total_invested: string; total_profit: string; count_done: string; best_pct: number | null }>(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_invested,
         COALESCE(SUM(payout - amount) FILTER (WHERE status = 'done'), 0) AS total_profit,
         COUNT(*) FILTER (WHERE status = 'done') AS count_done,
         MAX((payout - amount)::float / NULLIF(amount, 0)) FILTER (WHERE status = 'done') AS best_pct
       FROM investments WHERE user_id = $1::bigint`,
      [discordId]
    ),
    // "Coffre commun" : agrégat réel (aucune donnée par joueur exposée) de tout ce qui est
    // actuellement bloqué par l'ensemble des joueurs.
    pool.query<{ total: string; players: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(DISTINCT user_id) AS players
       FROM investments WHERE status = 'active'`
    ),
  ]);

  const coins = coinsRes.rows[0]?.coins ?? 0;
  const active = activeRes.rows[0] ?? null;
  const history = historyRes.rows;
  const stats = statsRes.rows[0];
  const vault = poolRes.rows[0];

  return (
    <main style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          backgroundImage: "url(/images/hero-banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(18px) brightness(0.4) saturate(1.1)",
          transform: "scale(1.1)",
        }}
      />
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: "rgba(13,17,23,0.4)" }} />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <h1 style={{ margin: 0, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>📈 Investissements</h1>
          <Link href="/" style={{ color: "#ddd", fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            ← Accueil
          </Link>
        </div>
        <p style={{ opacity: 0.85, color: "#ddd", marginTop: 4, marginBottom: 28, fontSize: 13, maxWidth: 640 }}>
          Identique à <code>!invest</code> sur Discord : bloque tes pièces 1h contre un rendement garanti de
          +10% à +20%. Un seul investissement actif à la fois.
        </p>

        <InvestClient
          coins={coins}
          initialActive={active}
          history={history}
          stats={{
            totalInvested: Number(stats?.total_invested ?? 0),
            totalProfit: Number(stats?.total_profit ?? 0),
            countDone: Number(stats?.count_done ?? 0),
            bestPct: stats?.best_pct != null ? Number(stats.best_pct) : null,
          }}
          vault={{ total: Number(vault?.total ?? 0), players: Number(vault?.players ?? 0) }}
        />
      </div>
    </main>
  );
}
