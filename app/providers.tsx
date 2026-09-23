"use client";

import { SessionProvider } from "next-auth/react";

// next-auth a besoin d'un composant client pour partager la session avec toute l'appli
// (App Router de Next.js sépare composants serveur / composants client).
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
