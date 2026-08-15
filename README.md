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
- Séance live avec enchaînement auto effort → repos → exercice suivant
- Historique local + export / import JSON
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

4. Dans le dashboard Supabase → **SQL Editor**, exécute tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) (tables + Row Level Security).
5. Dans **Authentication → Providers → Email**, laisse Email activé et désactive « Confirm email » pour connecter immédiatement les utilisateurs avec leur email et leur mot de passe.
6. Relance `npm run dev`, ouvre **Connexion**, crée un compte / connecte-toi.

À la connexion :
- si le cloud est vide → les données locales sont envoyées ;
- sinon → le cloud remplace le localStorage.

À la déconnexion, le cache local est vidé pour qu’un autre compte ne voie pas tes données sur le même appareil.

Les modifications (programmes, séances, exercices personnels) sont ensuite synchronisées automatiquement tant que tu es connecté.
