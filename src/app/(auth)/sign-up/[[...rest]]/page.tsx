/**
 * C-03/C-04 Sign up (Clerk-hosted). After sign up, go to onboarding (profile basics). Placeholder
 * when Clerk isn't configured so the dev flow still exercises onboarding.
 */
import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '../../AuthShell';
import { AuthPlaceholder } from '../../AuthPlaceholder';
import { isAuthConfigured } from '@/lib/env';

export default function SignUpPage() {
  return (
    <AuthShell>
      {isAuthConfigured ? (
        <SignUp forceRedirectUrl="/onboarding/profile" signInUrl="/sign-in" />
      ) : (
        <AuthPlaceholder title="Create account" continueTo="/onboarding/profile" />
      )}
    </AuthShell>
  );
}
