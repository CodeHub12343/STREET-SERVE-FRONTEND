/**
 * Edge auth (AUTHENTICATION_IMPLEMENTATION.md §5.1). Coarse "is there a session?" only — app
 * roles come from our DB, not the token. Public matchers cover marketing, auth, health, PWA
 * assets, and public reads (business profile, map browse, gift redeem).
 *
 * When Clerk isn't configured the middleware is a pass-through so the shell is browsable in dev.
 */
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const isPublicRoute = createRouteMatcher([
  '/',
  '/pre-register',
  '/for-vendors',
  '/for-sellers',
  '/legal(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/welcome',
  '/map(.*)', // map browse + list view (docblock: public reads; landing "Explore the live map" CTA)
  '/business/(.*)', // public profile + menu
  '/gift/(.*)', // redemption (guest)
  '/api/health',
]);

const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = auth();

  // C-01 splash / auth-check redirect: signed-in users skip the marketing/welcome pages.
  if (userId && (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/welcome')) {
    return NextResponse.redirect(new URL('/map', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth().protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!isAuthConfigured) return NextResponse.next();
  return clerk(req, event);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static files (unless referenced in search params).
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
