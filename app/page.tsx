"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
      <h1>🎮 Gacha Web</h1>

      {status === "loading" && <p>Chargement…</p>}

      {status === "unauthenticated" && (
        <>
          <p>Connecte-toi avec ton compte Discord pour voir ton inventaire.</p>
          <button
            onClick={() => signIn("discord")}
            style={{
              background: "#5865F2", color: "white", border: "none",
              padding: "12px 24px", borderRadius: 8, fontSize: 16, cursor: "pointer",
            }}
          >
            Se connecter avec Discord
          </button>
        </>
      )}

      {status === "authenticated" && (
        <>
          <p>
            Connecté en tant que <strong>{session.user?.name}</strong>
          </p>
          {/* Cet ID est EXACTEMENT le même que ctx.author.id côté bot Python : c'est la clé
              qui permettra bientôt d'aller chercher l'inventaire de ce joueur en base. */}
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            ID Discord : {(session.user as any)?.discordId}
          </p>
          <Link
            href="/inventaire"
            style={{
              display: "inline-block", background: "#171a21", color: "#eee",
              border: "1px solid #333", padding: "12px 24px", borderRadius: 8,
              textDecoration: "none", marginBottom: 16,
            }}
          >
            🎒 Voir mon inventaire
          </Link>
          <br />
          <button
            onClick={() => signOut()}
            style={{
              background: "transparent", color: "#eee", border: "1px solid #444",
              padding: "10px 20px", borderRadius: 8, cursor: "pointer", marginTop: 16,
            }}
          >
            Se déconnecter
          </button>
        </>
      )}
    </main>
  );
}
