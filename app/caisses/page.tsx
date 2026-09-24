import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { CASES, FREE_CASE, missionDayKey } from "@/lib/caisses";

const PANEL = "rgba(22,27,34,0.9)";
const BORDER = "rgba(255,255,255,0.14)";

export default async function CaissesPage() {
  const session = await getServerSession(authOptions);

  let freeCaseAvailable = false;
  if (session) {
    const discordId = (session.user as any)?.discordId as string;
    const { rows } = await pool.query<{ day: string }>(
      "SELECT day FROM free_case_claims WHERE user_id = $1::bigint",
      [discordId]
    );
    freeCaseAvailable = rows[0]?.day !== missionDayKey();
  }

  const allCrates = [FREE_CASE, ...CASES];

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

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <h1 style={{ margin: 0, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>📦 Caisses</h1>
          <Link href="/" style={{ color: "#ddd", fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            ← Accueil
          </Link>
        </div>
        <p style={{ opacity: 0.85, color: "#ddd", marginTop: 4, marginBottom: 30, fontSize: 13, maxWidth: 640 }}>
          Clique une caisse pour voir ses vraies probabilités de drop par rareté et l'ouvrir.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 22,
          }}
        >
          {allCrates.map((crate) => {
            const isFree = !!crate.free;
            const locked = isFree && !freeCaseAvailable;
            return (
              <Link
                key={crate.key}
                href={`/caisses/${crate.key}`}
                className="crate-card btn-anim"
                style={{
                  display: "block",
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderTop: `3px solid ${crate.color}`,
                  borderRadius: 16,
                  padding: "22px 18px 18px",
                  textAlign: "center",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: `0 0 30px ${crate.color}22`,
                  backdropFilter: "blur(4px)",
                  position: "relative",
                }}
              >
                {isFree && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: locked ? "rgba(255,255,255,0.1)" : `${crate.color}33`,
                      color: locked ? "#aaa" : crate.color,
                      letterSpacing: 0.4,
                    }}
                  >
                    {locked ? "RÉCLAMÉE" : "GRATUITE"}
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={crate.image}
                  alt={crate.name}
                  style={{
                    width: "100%",
                    height: 140,
                    objectFit: "contain",
                    filter: `drop-shadow(0 0 18px ${crate.color}77)`,
                    opacity: locked ? 0.45 : 1,
                  }}
                />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 12 }}>{crate.name}</div>
                <div style={{ fontSize: 13, marginTop: 4, color: crate.color, fontWeight: 600 }}>
                  {isFree ? "Gratuite" : `🪙 ${crate.price.toLocaleString("fr-FR")}`}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
