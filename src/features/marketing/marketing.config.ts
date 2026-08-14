/**
 * Landing-page configuration (LANDING_PAGE_STRATEGY.md §8, LANDING_PAGE_COMPONENT_SPECIFICATION.md §5).
 * One module drives launch-state variants and section flags — no CMS pre-launch.
 * Honesty rule: flags hide sections rather than filling them with fabricated content.
 */

export type LaunchState = 'prelaunch' | 'live';

export const launchState: LaunchState =
  process.env.NEXT_PUBLIC_LAUNCH_STATE === 'live' ? 'live' : 'prelaunch';

/**
 * Set NEXT_PUBLIC_LAUNCH_STATE=live to flip the whole marketing surface from "pre-register" to
 * "sign up and use it". Every launch-dependent string and CTA destination reads this, so going
 * live is a one-variable change — nothing else on the page has to be edited on launch day.
 */
export const isLive = launchState === 'live';

export const marketingConfig = {
  launchState,
  isLive,
  launchCity: 'Modesto, CA',
  /** Real testimonials don't exist pre-launch — section stays off until they do (D4). */
  showTestimonials: false,
  /**
   * Waitlist tile: wired to GET /preregistrations/count (LP-4). The tile still only renders
   * when the endpoint answers with a count > 0 — never a fake or broken number. Once live there
   * is no waitlist to be on, so the tile retires rather than counting something meaningless.
   */
  showWaitlistCount: !isLive,
  /**
   * The dismiss key differs per state on purpose: someone who dismissed the pre-launch banner
   * has not seen the launch announcement, and reusing the key would hide the one that matters.
   */
  announcement: isLive
    ? {
        message: '🗺️ StreetServe is live in Modesto, CA — open the map and see who’s out right now.',
        dismissKey: 'ss-banner-live-modesto',
      }
    : {
        message: '🚀 Launching first in Modesto, CA — pre-register to be first in line.',
        dismissKey: 'ss-banner-launch-modesto',
      },
  /** LP-5 replaces this with the on-page pre-registration wizard (?register=1). */
  primaryCtaHref: '#cta',
  finalCtaHref: '/welcome',
  demoHref: '/map',
  signInHref: '/sign-in',
  /** Where the primary CTA goes once live; pre-launch it opens the wizard instead of navigating. */
  signUpHref: '/sign-up',
  logoSrc: '/1000020693.png',
} as const;
