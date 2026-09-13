import type { Metadata, Viewport } from 'next';

// Le manifest racine (public/manifest.json) est celui de l'espace admin —
// l'espace chauffeur a sa propre PWA installable (icône, écran de démarrage,
// plein écran) avec son propre manifest et son propre point d'entrée.
export const metadata: Metadata = {
  title: 'FiatLux Chauffeur',
  manifest: '/chauffeur-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FL Chauffeur',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d4270',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function ChauffeurSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
