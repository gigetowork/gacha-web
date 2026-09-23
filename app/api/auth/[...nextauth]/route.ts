import NextAuth, { type AuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// Configuration NextAuth : gère tout le flow OAuth2 Discord (redirection vers Discord,
// callback, création de session) sans qu'on ait à écrire ça nous-mêmes.
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
