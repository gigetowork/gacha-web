import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { SignInButton, SignOutButton, RechargerButton } from "./components/AuthButtons";

// Couleurs reprises du logo "ZIZI FAMILY" sur la bannière : doré/orange pour "ZIZI",
// cyan pour "FAMILY".
const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";
const CYAN = "#3FD0E0";
const BG = "#0d1117";
const PANEL = "#161b22";
const BORDER = "#2a313c";

// Ratio EXACT de l'image source (1376x768) : en gardant ce ratio pour le cadre, l'image
// s'affiche toujours en entier, sans jamais rogner le haut ou le bas.
const BANNER_RATIO = "1376 / 768";

// Onglets de navigation façon HUD de jeu. "soon: true" = la page existe (pas de lien mort)
// mais affiche juste "en construction" en attendant qu'on la développe vraiment.
const NAV_TABS = [
  { label: "ACCUEIL", href: "/", active: true, soon: false },
  { label: "INVENTAIRE", href: "/inventaire", active: false, soon: false },
  { label: "BOUTIQUE", href: "/boutique", active: false, soon: true },
  { label: "MES CAISSES", href: "/caisses", active: false, soon: true },
  { label: "STATS", href: "/stats", active: false, soon: true },
  { label: "TOP JOUEURS", href: "/top-joueurs", active: false, soon: true },
];

const CRATES = [
  { name: "Caisse Débutant", emoji: "📦" },
  { name: "Caisse Métallique", emoji: "🗃️" },
  { name: "Caisse Armes Légendaires", emoji: "🎖️" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Vrais crédits du joueur (table economy, partagée avec le bot) -- jamais de chiffre inventé.
  let coins = 0;
  if (session) {
    const discordId = (session.user as any)?.discordId as string;
    const { rows } = await pool.query<{ coins: number }>(
      "SELECT coins FROM economy WHERE user_id = $1::bigint",
      [discordId]
    );
    coins = rows[0]?.coins ?? 0;
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, color: "#eee" }}>
      {/* Barre HUD du haut : profil à gauche, navigation au centre, compte à droite */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: "14px 20px",
          borderBottom: `1px solid ${BORDER}`,
          background: PANEL,
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
                <div style={{ fontSize: 14, fontWeight: 600 }}>{session.user?.name}</div>
                <div style={{ fontSize: 11, color: "#4ade80" }}>● En ligne</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.5 }}>Non connecté</div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
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
                color: tab.active ? "#12161c" : "#ccc",
                background: tab.active ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})` : "transparent",
                border: tab.active ? "none" : `1px solid ${BORDER}`,
              }}
            >
              {tab.label}
              {tab.soon && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400 }}>(bientôt)</span>}
            </Link>
          ))}
        </nav>

        {/* Compte */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 160, justifyContent: "flex-end" }}>
          {session ? (
            <>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, opacity: 0.5 }}>Crédits</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: GOLD_LIGHT }}>
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

      {/* Bannière hero : le cadre garde le ratio exact de l'image -> jamais de recadrage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1600,
          margin: "0 auto",
          aspectRatio: BANNER_RATIO,
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-banner.jpg"
          alt="Zizi Family"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "35%",
            background: `linear-gradient(to bottom, rgba(13,17,23,0) 0%, ${BG} 96%)`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Rangée de caisses : pour l'instant purement visuel, elles renvoient vers la page
          "Mes Caisses" (en construction) -- l'ouverture animée viendra dans une prochaine étape. */}
      <div
        style={{
          maxWidth: 900,
          margin: "-40px auto 0",
          position: "relative",
          zIndex: 2,
          padding: "0 20px 90px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {CRATES.map((crate) => (
            <Link key={crate.name} href="/caisses" style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderTop: `2px solid ${CYAN}`,
                  borderRadius: 14,
                  padding: "26px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>{crate.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                  {crate.name.toUpperCase()}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!session ? (
          <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, marginTop: 24 }}>
            Connecte-toi avec Discord pour retrouver ton compte ici.
          </p>
        ) : (
          <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, marginTop: 24 }}>
            🚧 L'ouverture de caisses depuis le site arrive bientôt — pour l'instant, utilise{" "}
            <code>!pull</code> sur Discord.
          </p>
        )}
      </div>
    </main>
  );
}
