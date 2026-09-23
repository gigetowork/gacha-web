"use client";

import { signIn, signOut } from "next-auth/react";
import type { CSSProperties } from "react";

const GOLD = "#F5B942";
const GOLD_LIGHT = "#FFD778";
const BORDER = "#2a313c";

const btnDiscord: CSSProperties = {
  display: "inline-block",
  background: "#5865F2",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(88,101,242,0.35)",
};

const btnGhost: CSSProperties = {
  background: "transparent",
  color: "#aaa",
  border: `1px solid ${BORDER}`,
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
};

const btnRecharger: CSSProperties = {
  background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
  color: "#1a1206",
  fontWeight: 700,
  border: "none",
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function SignInButton() {
  return (
    <button onClick={() => signIn("discord")} style={btnDiscord}>
      Se connecter avec Discord
    </button>
  );
}

export function SignOutButton() {
  return (
    <button onClick={() => signOut()} style={btnGhost}>
      Se déconnecter
    </button>
  );
}

export function RechargerButton() {
  // Pointe vers la boutique (pas encore construite) plutôt que de simuler un achat.
  return (
    <a href="/boutique" style={{ textDecoration: "none" }}>
      <button style={btnRecharger}>RECHARGER</button>
    </a>
  );
}
