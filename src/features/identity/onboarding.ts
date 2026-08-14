/**
 * Onboarding step order (C-05 → C-08). Drives the WizardFlow progress indicator and next/back
 * navigation. After the last step the user lands on the map (M2 exit criterion).
 */
export const ONBOARDING_STEPS = [
  '/onboarding/profile',
  '/onboarding/role',
  '/onboarding/location',
  '/onboarding/notifications',
] as const;

export type OnboardingPath = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/** After onboarding, land on the map with the first-run tutorial (C-09). */
export const AFTER_ONBOARDING = '/map?tour=1';

export function stepNumber(path: OnboardingPath): number {
  return ONBOARDING_STEPS.indexOf(path) + 1;
}

export function nextPath(path: OnboardingPath): string {
  const i = ONBOARDING_STEPS.indexOf(path);
  return i < 0 || i === ONBOARDING_STEPS.length - 1
    ? AFTER_ONBOARDING
    : ONBOARDING_STEPS[i + 1]!;
}

export function prevPath(path: OnboardingPath): OnboardingPath | null {
  const i = ONBOARDING_STEPS.indexOf(path);
  return i > 0 ? ONBOARDING_STEPS[i - 1]! : null;
}
