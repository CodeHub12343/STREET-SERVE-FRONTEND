/**
 * C-03/C-04 Sign up (Clerk-hosted).
 *
 * Honours `?redirect_url=` so a flow that bounced here from a protected action (e.g. the sponsor
 * checkout) lands back where it started after onboarding completes. Without a redirect we keep the
 * default of `/onboarding/profile` so first-run users still see profile basics; with one, we land
 * them where they were going and let onboarding happen on their next natural visit.
 */
import { headers } from 'next/headers';
import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '../../AuthShell';
import { AuthPlaceholder } from '../../AuthPlaceholder';
import { isAuthConfigured } from '@/lib/env';

const DEFAULT_AFTER_SIGN_UP = '/onboarding/profile';
/** Paths we never bounce back to — they'd just re-trigger the auth flow. */
const AUTH_PATHS = ['/sign-in', '/sign-up'];

/**
 * Only accept same-site destinations; discard anything that would redirect off-domain or back to
 * an auth page (that would just loop). Accepts both a bare path (`/sponsor`) and a same-origin
 * absolute URL (`http://localhost:3000/sponsor`) — Clerk itself writes the sibling link's
 * `redirect_url` as the latter, which the earlier path-only check silently rejected.
 */
function safeRedirect(raw: string | string[] | undefined | null): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return null;

  let path: string;
  if (v.startsWith('/') && !v.startsWith('//')) {
    path = v;
  } else if (/^https?:\/\//i.test(v)) {
    const self = headers().get('host');
    try {
      const u = new URL(v);
      if (self && u.host !== self) return null;
      path = u.pathname + u.search + u.hash;
    } catch {
      return null;
    }
  } else {
    return null;
  }

  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))) {
    return null;
  }
  return path;
}

/**
 * Falls back to the `Referer` when the caller didn't pass `?redirect_url=`. Covers the top-nav
 * "Get started" case where the button was a plain link with no explicit redirect — the page the
 * user came from is the page they want to land back on.
 */
function refererPath(): string | null {
  const ref = headers().get('referer');
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const self = headers().get('host');
    if (self && u.host !== self) return null;
    return safeRedirect(u.pathname + u.search);
  } catch {
    return null;
  }
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string | string[] };
}) {
  const after =
    safeRedirect(searchParams.redirect_url) ?? refererPath() ?? DEFAULT_AFTER_SIGN_UP;
  const signInHref = after === DEFAULT_AFTER_SIGN_UP
    ? '/sign-in'
    : `/sign-in?redirect_url=${encodeURIComponent(after)}`;

  return (
    <AuthShell>
      {isAuthConfigured ? (
        <SignUp
          forceRedirectUrl={after}
          signInForceRedirectUrl={after}
          signInUrl={signInHref}
        />
      ) : (
        <AuthPlaceholder title="Create account" continueTo={after} />
      )}
    </AuthShell>
  );
}
