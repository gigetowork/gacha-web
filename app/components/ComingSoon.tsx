import Link from "next/link";

const CYAN = "#3FD0E0";
const PANEL = "#161b22";
const BORDER = "#2a313c";

// Petite page d'attente réutilisée par les onglets pas encore construits (Boutique, Stats,
// Top Joueurs, Mes Caisses) : évite un lien mort en attendant qu'on développe la vraie page.
export default function ComingSoon({ title, emoji }: { title: string; emoji: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: "48px 36px",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>{title}</h1>
        <p style={{ opacity: 0.6, marginBottom: 28 }}>
          Cette section est en cours de construction — reviens bientôt !
        </p>
        <Link href="/" style={{ color: CYAN, textDecoration: "none", fontSize: 14 }}>
          ← Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
