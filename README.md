# Sportivis

Suivi de séances et programmes de sport (salle, machines, poids libres, cardio).

## Démarrer

```bash
npm install
npm run dev
```

Ouvre l’URL affichée (souvent http://localhost:5173).

## Fonctionnalités

- Bibliothèque d’exercices filtrable (photos libres)
- Programmes avec séries, reps / durée / distance, repos, temps d’effort et charge
- Génération de programme par IA (Groq) et estimation calorique des repas
- Partage privé d’un programme à un autre compte avec aperçu, acceptation ou refus
- Séance live avec enchaînement auto effort → repos → exercice suivant
- Historique local + export / import JSON
- Interface en français et en hébreu (RTL)
- Synchronisation cloud optionnelle via Supabase

Quand Supabase est configuré, un compte est requis : **Exercices**, **Programmes**, **Séance**, **Historique** et **Compte** ne sont accessibles qu’une fois connecté, et les données sont synchronisées en cloud. Sans Supabase configuré, l’app reste utilisable sans compte avec les données dans le `localStorage` du navigateur.

## Brancher Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings → API**, copie l’URL et la clé `anon` `public`.
3. Copie le fichier d’environnement :

```bash
cp .env.example .env
```

Puis renseigne :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

4. Dans le dashboard Supabase → **SQL Editor**, exécute tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), puis [`supabase/program_sharing.sql`](supabase/program_sharing.sql), [`supabase/ai_features.sql`](supabase/ai_features.sql) et [`supabase/profile_nutrition.sql`](supabase/profile_nutrition.sql) (tables, fonctions et Row Level Security).
5. Dans **Authentication → Providers → Email**, laisse Email activé et désactive « Confirm email » pour connecter immédiatement les utilisateurs avec leur email et leur mot de passe.
6. Relance `npm run dev`, ouvre **Connexion**, crée un compte / connecte-toi.

À la connexion :
- si le cloud est vide → les données locales sont envoyées ;
- sinon → le cloud remplace le localStorage.

À la déconnexion, le cache local est vidé pour qu’un autre compte ne voie pas tes données sur le même appareil.

Les modifications (programmes, séances, exercices personnels) sont ensuite synchronisées automatiquement tant que tu es connecté.

## Brancher l’IA (Groq)

La génération de programme et l’analyse des repas passent par deux fonctions serverless dans [`api/`](api), afin que la clé du modèle ne soit jamais exposée au navigateur.

1. Crée une clé gratuite sur [Groq Console](https://console.groq.com/keys).
2. Ajoute-la dans `.env` pour le développement local :

```
GROQ_API_KEY=...
```

3. En production, déclare dans **Vercel → Project Settings → Environment Variables** (cible **Production**, pas seulement Preview) :
   - `GROQ_API_KEY` (obligatoire pour `/api/generate-program` et `/api/analyze-meal`)
   - `SUPABASE_URL` et `SUPABASE_ANON_KEY` (recommandé ; sinon les `VITE_*` sont utilisées en repli)
   Puis **redéploie**. Les variables `VITE_` seules suffisent au front, pas forcément aux fonctions serverless si elles ne sont pas exposées au runtime.
4. Exécute [`supabase/ai_features.sql`](supabase/ai_features.sql) : il crée le journal alimentaire et le compteur de quota.

Par défaut, repas = `llama-3.1-8b-instant` et programmes = `llama-3.3-70b-versatile` (70B uniquement, sans bascule vers le 8B).

Le quota journalier par utilisateur est appliqué dans Postgres (`consume_ai_quota`), donc il n’est pas contournable depuis le client : 10 générations de programme et 40 analyses de repas par jour. Les valeurs se changent dans la fonction `ai_quota_limit`.

Les estimations nutritionnelles sont des ordres de grandeur produits par le modèle, pas des mesures.
