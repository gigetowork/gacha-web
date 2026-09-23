import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Un fichier route.ts de l'App Router ne peut exporter QUE des méthodes HTTP (GET, POST, ...) —
// c'est pour ça que la config authOptions vit maintenant dans lib/auth.ts et qu'on l'importe ici.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
