import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Gacha Web",
  description: "Le compagnon web de ton bot Discord",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0f1115", color: "#eee", margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
