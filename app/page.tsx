"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

// Couleurs reprises du logo "ZIZI FAMILY" sur la bannière : doré/orange pour "ZIZI",
// cyan pour "FAMILY". Le fond sombre reprend le gris métallique de l'arrière-plan de l'image,
// pour que la bannière se fonde naturellement dans le reste de la page.
const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";
const CYAN = "#3FD0E0";
const BG = "#0d1117";
const PANEL = "#161b22";
const BORDER = "#2a313c";

// Ratio EXACT de l'image source (1376x768) : en gardant ce ratio pour le cadre, l'image
// s'affiche toujours en entier, sans jamais rogner le haut ou le bas, quelle que soit la
// largeur d'écran.
const BANNER_RATIO = "1376 / 768";

const btnDiscord: CSSProperties = {
  display: "inline-block",
  background: "#5865F2",
  color: "white",
  border: "none",
  padding: "14px 28px",
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(88,101,242,0.35)",
};

const btnPrimary: CSSProperties = {
  display: "inline-block",
  background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
  color: "#1a1206",
  fontWeight: 700,
  border: "none",
  padding: "14px 30px",
  borderRadius: 10,
  fontSize: 16,
  textDecoration: "none",
  boxShadow: "0 8px 24px rgba(245,185,66,0.3)",
};

const btnGhost: CSSProperties = {
  background: "transparent",
  color: "#aaa",
  border: `1px solid ${BORDER}`,
  padding: "10px 22px",
  borderRadius: 10,
  fontSize: 14,
  cursor: "pointer",
};

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main style={{ minHeight: "100vh", background: BG, color: "#eee" }}>
      {/* Bannière hero : le cadre garde le ratio exact de l'image -> jamais de recadrage,
          juste une mise à l'échelle propre selon la largeur d'écran. */}
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
        {/* Fondu vers le fond sombre pour que la bannière s'intègre à la page plutôt que de
            s'arrêter net sur un bord tranché. */}
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

      {/* Contenu principal, remonté légèrement sur la bannière pour un effet "panneau flottant" */}
      <div
        style={{
          maxWidth: 520,
          margin: "-48px auto 0",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "0 20px 100px",
        }}
      >
        {status === "loading" && <p style={{ opacity: 0.6 }}>Chargement…</p>}

        {status === "unauthenticated" && (
          <div
            style={{
              background: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "36px 28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: 26,
                background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${CYAN})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Bienvenue dans l'arsenal
            </h1>
            <p style={{ opacity: 0.75, marginBottom: 28, lineHeight: 1.5 }}>
              Connecte-toi avec ton compte Discord pour accéder à ton inventaire de skins.
            </p>
            <button onClick={() => signIn("discord")} style={btnDiscord}>
              Se connecter avec Discord
            </button>
          </div>
        )}

        {status === "authenticated" && (
          <div
            style={{
              background: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "36px 28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <p style={{ margin: 0, fontSize: 18 }}>
              Content de te revoir, <strong style={{ color: GOLD_LIGHT }}>{session.user?.name}</strong>
            </p>
            {/* Cet ID est EXACTEMENT le même que ctx.author.id côté bot Python : c'est la clé
                qui sert à aller chercher l'inventaire de ce joueur en base. */}
            <p style={{ opacity: 0.5, fontSize: 12, marginTop: 4, marginBottom: 28 }}>
              ID Discord : {(session.user as any)?.discordId}
            </p>

            <Link href="/inventaire" style={btnPrimary}>
              🎒 Voir mon inventaire
            </Link>

            <div style={{ marginTop: 18 }}>
              <button onClick={() => signOut()} style={btnGhost}>
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
