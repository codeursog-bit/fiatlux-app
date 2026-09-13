import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Le middleware ne gère QUE la protection des PAGES (redirections
 * navigateur basées sur la présence d'un cookie). Les routes /api/*
 * délèguent entièrement leur autorisation à requireAuth() (vérification
 * du JWT Bearer, avec le bon rôle) dans chaque route handler — plusieurs
 * routes /api/admin/orders/* sont légitimement appelées à la fois par
 * l'admin (cookie fiatlux_token) ET par un chauffeur authentifié
 * (cookie fiatlux_rider_token, différent), donc un gate par cookie
 * générique ici bloquerait à tort les appels chauffeur.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Les routes API gèrent leur propre auth via requireAuth() —
  // on ne fait ici aucune vérification de cookie sur /api/*.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('fiatlux_token')?.value;
  const riderToken = request.cookies.get('fiatlux_rider_token')?.value;
  const partnerToken = request.cookies.get('fiatlux_partner_token')?.value;

  // Espace chauffeur : cookie dédié, jamais le cookie admin/partenaire
  if (pathname.startsWith('/chauffeur') && pathname !== '/chauffeur/login') {
    if (!riderToken) {
      return NextResponse.redirect(new URL('/chauffeur/login', request.url));
    }
    return NextResponse.next();
  }

  if (riderToken && pathname === '/chauffeur/login') {
    return NextResponse.redirect(new URL('/chauffeur/dashboard', request.url));
  }

  // Espace partenaire : cookie dédié fiatlux_partner_token, séparé de
  // fiatlux_token (admin) — même principe que le chauffeur, pour que les
  // deux espaces ne se marchent plus dessus.
  if (pathname.startsWith('/partners') && pathname !== '/partners/login') {
    if (!partnerToken) {
      return NextResponse.redirect(new URL('/partners/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/partners/login') {
    if (partnerToken) {
      return NextResponse.redirect(new URL('/partners/dashboard', request.url));
    }
    return NextResponse.next();
  }

  const publicExactPaths = [
    '/',
    '/login',
    '/chauffeur/login',
    '/commander',
    '/suivre',
    '/cgu',
    '/confidentialite',
    '/aide',
    '/offline',
  ];

  // Préfixes publics : couvre les routes dynamiques comme /suivi/[token],
  // /paiement/[orderId], /commander/confirmation/[trackingNumber] — un
  // simple match exact ne matche JAMAIS ces routes.
  const publicPrefixes = [
    '/suivi/',
    '/paiement/',
    '/commander/confirmation/',
    '/track/',
  ];

  const isPublicPath =
    publicExactPaths.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};