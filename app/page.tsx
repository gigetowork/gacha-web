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

// 5 paliers de caisses, couleurs reprises de ta charte (grise -> cyan -> bleu -> or -> violet).
// Les prix affichés sont ceux de ta maquette -- purement visuels tant que l'achat/l'ouverture
// réelle n'est pas branché (ça renvoie vers "Mes Caisses", en construction).
const CRATE_TIERS = [
  { key: "recrue", name: "Recrue", price: 200, color: "#9AA3AD" },
  { key: "standard", name: "Standard", price: 450, color: "#2DD9E0" },
  { key: "elite", name: "Élite", price: 900, color: "#3B6FE8" },
  { key: "legendaire", name: "Légendaire", price: 1800, color: GOLD },
  { key: "mythique", name: "Mythique", price: 3200, color: "#C13FE0" },
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

      {/* Rangée de 5 caisses : pour l'instant purement visuel, elles renvoient vers la page
          "Mes Caisses" (en construction) -- l'ouverture animée viendra dans une prochaine étape. */}
      <div
        style={{
          maxWidth: 1100,
          margin: "-56px auto 0",
          position: "relative",
          zIndex: 2,
          padding: "0 20px 90px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14,
          }}
        >
          {CRATE_TIERS.map((crate) => (
            <Link
              key={crate.key}
              href="/caisses"
              className="crate-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderTop: `3px solid ${crate.color}`,
                  borderRadius: 14,
                  padding: "22px 12px",
                  textAlign: "center",
                  boxShadow: `0 0 24px ${crate.color}33`,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: crate.color }}>
                  {crate.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  🪙 {crate.price.toLocaleString("fr-FR")}
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
