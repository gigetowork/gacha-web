import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { SignInButton, SignOutButton, RechargerButton } from "./components/AuthButtons";
import { CASES, FREE_CASE, missionDayKey } from "@/lib/caisses";

// Couleurs reprises du logo "ZIZI FAMILY" sur la bannière : doré/orange pour "ZIZI",
// cyan pour "FAMILY".
const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";
const CYAN = "#3FD0E0";
const BG = "#0d1117";

// Onglets de navigation façon HUD de jeu. "soon: true" = la page existe (pas de lien mort)
// mais affiche juste "en construction" en attendant qu'on la développe vraiment.
const NAV_TABS = [
  { label: "ACCUEIL", href: "/", active: true, soon: false },
  { label: "INVENTAIRE", href: "/inventaire", active: false, soon: false },
  { label: "ÉQUIPEMENT", href: "/equipement", active: false, soon: false },
  { label: "INVESTIR", href: "/investissements", active: false, soon: false },
  { label: "MES CAISSES", href: "/caisses", active: false, soon: false },
  { label: "STATS", href: "/stats", active: false, soon: true },
  { label: "TOP JOUEURS", href: "/top-joueurs", active: false, soon: true },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Vrais crédits du joueur ET disponibilité de la caisse gratuite du jour (tables economy /
  // free_case_claims, partagées avec le bot) -- jamais de chiffre ou d'état inventé.
  let coins = 0;
  let freeCaseAvailable = false;
  if (session) {
    const discordId = (session.user as any)?.discordId as string;
    const [coinsRes, freeCaseRes] = await Promise.all([
      pool.query<{ coins: number }>("SELECT coins FROM economy WHERE user_id = $1::bigint", [discordId]),
      pool.query<{ day: string }>("SELECT day FROM free_case_claims WHERE user_id = $1::bigint", [discordId]),
    ]);
    coins = coinsRes.rows[0]?.coins ?? 0;
    const claimedDay = freeCaseRes.rows[0]?.day;
    freeCaseAvailable = claimedDay !== missionDayKey();
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, color: "#eee" }}>
      {/* Bannière hero plein écran : l'image couvre tout le viewport, la barre HUD flotte
          par-dessus en transparence. */}
      <div style={{ position: "relative", width: "100%", height: "100vh", minHeight: 560, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-banner.jpg"
          alt="Zizi Family"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        {/* Fondu en haut (pour que la barre HUD reste lisible) et en bas (transition vers la
            suite de la page). */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, rgba(13,17,23,0.75) 0%, rgba(13,17,23,0) 18%, rgba(13,17,23,0) 70%, ${BG} 100%)`,
            pointerEvents: "none",
          }}
        />

        {/* Barre HUD superposée sur la bannière : profil à gauche, navigation au centre,
            compte à droite. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "16px 24px",
          }}
        >
          {/* Profil */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
            {session ? (
              <>
                {session.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${CYAN}` }}
                  />
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    {session.user?.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#4ade80", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    ● En ligne
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.75, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                Non connecté
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="hud-tab"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: 0.4,
                  whiteSpace: "nowrap",
                  color: tab.active ? "#12161c" : "#eee",
                  background: tab.active
                    ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`
                    : "rgba(13,17,23,0.55)",
                  border: tab.active ? "none" : `1px solid rgba(255,255,255,0.15)`,
                  backdropFilter: "blur(6px)",
                }}
              >
                {tab.label}
                {tab.soon && <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>(bientôt)</span>}
              </Link>
            ))}
          </nav>

          {/* Compte */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 160, justifyContent: "flex-end" }}>
            {session ? (
              <>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, opacity: 0.75, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    Crédits
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: GOLD_LIGHT,
                      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {coins.toLocaleString("fr-FR")} ZC
                  </div>
                </div>
                <RechargerButton />
                <SignOutButton />
              </>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </div>

      {/* Rangée de 6 caisses (5 payantes + la gratuite) : chaque caisse mène à sa page détaillée
          (vraie image, vraies probabilités par rareté, ouverture réelle connectée à la même base
          que le bot). */}
      <div
        id="caisses"
        style={{
          maxWidth: 1200,
          margin: "-56px auto 0",
          position: "relative",
          zIndex: 2,
          padding: "0 20px 90px",
          scrollMarginTop: 90,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14,
          }}
        >
          {[FREE_CASE, ...CASES].map((crate) => {
            const isFree = !!crate.free;
            const locked = isFree && !freeCaseAvailable;
            return (
              <Link
                key={crate.key}
                href={`/caisses/${crate.key}`}
                className="crate-card btn-anim"
                style={{
                  display: "block",
                  background: "#161b22",
                  border: "1px solid #2a313c",
                  borderTop: `3px solid ${crate.color}`,
                  borderRadius: 14,
                  padding: "16px 10px 14px",
                  textAlign: "center",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: `0 0 24px ${crate.color}33`,
                  position: "relative",
                }}
              >
                {isFree && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 5,
                      background: locked ? "rgba(255,255,255,0.1)" : `${crate.color}33`,
                      color: locked ? "#999" : crate.color,
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
                    height: 88,
                    objectFit: "contain",
                    filter: `drop-shadow(0 0 12px ${crate.color}77)`,
                    opacity: locked ? 0.45 : 1,
                  }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, letterSpacing: 0.3, color: crate.color }}>
                  {(isFree ? "Gratuite" : crate.name.replace("Caisse ", "")).toUpperCase()}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>
                  {isFree ? (locked ? "Déjà réclamée" : "GRATUITE") : `🪙 ${crate.price.toLocaleString("fr-FR")}`}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
