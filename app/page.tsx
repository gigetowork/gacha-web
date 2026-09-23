"use client";

import Link from "next/link";
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

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main style={{ minHeight: "100vh", background: BG, color: "#eee" }}>
      {/* Bannière hero */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-banner.jpg"
          alt="Zizi Family"
          style={{
            width: "100%",
            height: "auto",
            maxHeight: 520,
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* Fondu vers le fond sombre pour que la bannière s'intègre à la page plutôt que de
            s'arrêter net sur un bord tranché. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "45%",
            background: `linear-gradient(to bottom, rgba(13,17,23,0) 0%, ${BG} 96%)`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Contenu principal, remonté légèrement sur la bannière pour un effet "panneau flottant" */}
      <div
        style={{
          maxWidth: 520,
          margin: "-64px auto 0",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "0 20px 80px",
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
            <button onClick={() => signIn("discord")} className="btn-discord">
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

            <Link href="/inventaire" className="btn-primary">
              🎒 Voir mon inventaire
            </Link>

            <div style={{ marginTop: 18 }}>
              <button onClick={() => signOut()} className="btn-ghost">
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .btn-discord {
          display: inline-block;
          background: #5865f2;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(88, 101, 242, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-discord:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(88, 101, 242, 0.5);
        }

        .btn-primary {
          display: inline-block;
          background: linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT});
          color: #1a1206;
          font-weight: 700;
          border: none;
          padding: 14px 30px;
          border-radius: 10px;
          font-size: 16px;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(245, 185, 66, 0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(245, 185, 66, 0.45);
        }

        .btn-ghost {
          background: transparent;
          color: #aaa;
          border: 1px solid ${BORDER};
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .btn-ghost:hover {
          border-color: ${CYAN};
          color: ${CYAN};
        }
      `}</style>
    </main>
  );
}
