# Flair — Radar de bons plans parfum

## Lancer l'application

1. Copier `.env.example` en `.env`
2. Renseigner `FRAGELLA_API_KEY` dans `.env`
3. `node server.js`
4. Ouvrir http://127.0.0.1:4173

## Stack
- Frontend : HTML / CSS / JavaScript vanilla
- Backend : Node.js natif (sans dépendances)
- Stockage : localStorage (favoris + offres manuelles)
- API externe : Fragella (proxiée côté serveur)

## Fonctionnalités
- Radar de bons plans avec score, filtres et tris
- Ajout manuel d'offres
- Recherche de fiches parfum via Fragella
- Parfums similaires au clic
- Favoris persistants

## API Fragella

Les endpoints utilisés sont supposés être :
- `GET https://api.fragella.com/v1/fragrances?q=<query>&limit=8`
- `GET https://api.fragella.com/v1/fragrances/similar?name=<name>&limit=8`

Si l'URL réelle est différente, modifier les constantes dans `server.js` :
```js
const FRAGELLA_BASE = 'https://api.fragella.com'; // ligne à ajuster
```

## Sécurité
La clé Fragella n'est jamais exposée côté client.
Ne pas committer `.env`.
