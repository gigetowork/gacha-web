# Gacha Web — étape 1 : login Discord

Squelette Next.js minimal qui fait UNE seule chose pour l'instant : se connecter avec Discord
et afficher ton pseudo + ton ID Discord (le même ID que celui utilisé par le bot Python en base
de données — `ctx.author.id`). C'est la première brique du site compagnon du bot.

## Mise en route en local

1. `npm install`
2. Copie `.env.example` en `.env.local` et remplis les 3 valeurs :
   - `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` : portail développeur Discord → ton appli → OAuth2 → General
   - `NEXTAUTH_SECRET` : génère avec `openssl rand -base64 32`
   - `DATABASE_URL` : pas encore utilisée à cette étape, tu peux la laisser telle quelle pour l'instant
3. Dans le portail développeur Discord, section OAuth2 → Redirects, ajoute :
   `http://localhost:3000/api/auth/callback/discord`
4. `npm run dev`, puis ouvre http://localhost:3000 et clique "Se connecter avec Discord".

Si tu vois ton pseudo Discord + ton ID s'afficher après connexion : cette étape est validée. 🎉

## Déploiement sur Vercel

1. Pousse ce dossier dans ton dépôt GitHub (celui déjà relié à Vercel), ou connecte un nouveau projet Vercel à ce dépôt.
2. Dans les Project Settings de Vercel → Environment Variables, ajoute les 4 mêmes variables que dans `.env.local`
   (`NEXTAUTH_URL` = l'URL de ton déploiement Vercel, ex: `https://gacha-web.vercel.app`).
3. Retourne dans le portail développeur Discord et ajoute UN DEUXIÈME Redirect URI, cette fois avec ton domaine Vercel :
   `https://gacha-web.vercel.app/api/auth/callback/discord`
4. Redéploie (Vercel le fait automatiquement à chaque push).

## Et après ?

Cette étape ne touche PAS encore à la base de données ni au bot — c'est fait exprès, pour valider
le login tout seul avant de complexifier. La suite (une fois que le login fonctionne pour toi) :
brancher `DATABASE_URL` sur la base Postgres partagée avec le bot, et afficher l'inventaire réel
du joueur connecté.
