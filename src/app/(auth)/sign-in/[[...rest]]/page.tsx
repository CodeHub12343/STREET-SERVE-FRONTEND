/**
 * C-03/C-04 Sign in (Clerk-hosted OTP/password, AUTHENTICATION_IMPLEMENTATION.md §1). After sign
 * in, land on the map. Placeholder when Clerk isn't configured so the shell is navigable in dev.
 */
import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '../../AuthShell';
import { AuthPlaceholder } from '../../AuthPlaceholder';
import { isAuthConfigured } from '@/lib/env';

export default function SignInPage() {
  return (
    <AuthShell>
      {isAuthConfigured ? (
        <SignIn forceRedirectUrl="/map" signUpUrl="/sign-up" />
      ) : (
        <AuthPlaceholder title="Sign in" continueTo="/map" />
      )}
    </AuthShell>
  );
}
