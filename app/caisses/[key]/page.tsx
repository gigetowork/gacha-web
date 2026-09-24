import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { findCase, missionDayKey, oddsForCase } from "@/lib/caisses";
import CaseDetailClient from "../../components/CaseDetailClient";

export default async function CaisseDetailPage({ params }: { params: { key: string } }) {
  const caseConfig = findCase(params.key);
  if (!caseConfig) notFound();

  const session = await getServerSession(authOptions);

  let coins = 0;
  let freeCaseAvailable = false;
  if (session) {
    const discordId = (session.user as any)?.discordId as string;
    const [coinsRes, freeCaseRes] = await Promise.all([
      pool.query<{ coins: number }>("SELECT coins FROM economy WHERE user_id = $1::bigint", [discordId]),
      pool.query<{ day: string }>("SELECT day FROM free_case_claims WHERE user_id = $1::bigint", [discordId]),
    ]);
    coins = coinsRes.rows[0]?.coins ?? 0;
    freeCaseAvailable = freeCaseRes.rows[0]?.day !== missionDayKey();
  }

  const odds = oddsForCase(caseConfig);

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
          filter: "blur(20px) brightness(0.35) saturate(1.15)",
          transform: "scale(1.1)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: `radial-gradient(circle at 50% 0%, ${caseConfig.color}22 0%, rgba(13,17,23,0.55) 60%)`,
        }}
      />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
          <Link href="/caisses" style={{ color: "#ddd", fontSize: 13, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            ← Toutes les caisses
          </Link>
          <Link href="/" style={{ color: "#ddd", fontSize: 13, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Accueil
          </Link>
        </div>

        <CaseDetailClient
          caseConfig={caseConfig}
          odds={odds}
          isAuthenticated={!!session}
          coins={coins}
          freeCaseAvailable={freeCaseAvailable}
        />
      </div>
    </main>
  );
}
