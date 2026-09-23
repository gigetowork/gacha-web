import { type AuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// Configuration NextAuth : gère tout le flow OAuth2 Discord (redirection vers Discord,
// callback, création de session) sans qu'on ait à écrire ça nous-mêmes.
//
// Ce fichier vit dans lib/ (et non dans app/api/auth/[...nextauth]/route.ts) car Next.js
// interdit d'exporter autre chose que GET/POST/etc. depuis un fichier route.ts de l'App
// Router. "authOptions" doit donc être défini ailleurs puis importé par route.ts.
export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // On injecte l'ID Discord de l'utilisateur dans la session : c'est CET ID (même format que
    // ctx.author.id côté bot Python) qui servira de clé pour retrouver son inventaire/solde en base.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = (profile as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).discordId = token.discordId;
      return session;
    },
  },
};
