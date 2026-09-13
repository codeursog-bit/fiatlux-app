// Déclaration de type globale (ambient) pour les imports CSS "side-effect"
// (ex: import 'leaflet/dist/leaflet.css';). Next.js sait déjà bundler ce
// genre d'import au build, mais TypeScript seul (tsc --noEmit) ne connaît
// nativement que les fichiers *.module.css — pas le CSS brut fourni par un
// package tiers comme Leaflet. Cette déclaration comble ce trou pour
// n'importe quel fichier .css du projet.
declare module '*.css';