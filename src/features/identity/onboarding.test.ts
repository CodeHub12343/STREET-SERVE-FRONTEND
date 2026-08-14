import { describe, expect, it } from 'vitest';
import {
  AFTER_ONBOARDING,
  ONBOARDING_TOTAL,
  nextPath,
  prevPath,
  stepNumber,
} from './onboarding';
import { INTENT_TO_ROLE } from './types';

describe('onboarding flow', () => {
  it('numbers steps 1-based in order', () => {
    expect(stepNumber('/onboarding/profile')).toBe(1);
    expect(stepNumber('/onboarding/notifications')).toBe(ONBOARDING_TOTAL);
  });

  it('advances to the next step, then to the map', () => {
    expect(nextPath('/onboarding/profile')).toBe('/onboarding/role');
    expect(nextPath('/onboarding/notifications')).toBe(AFTER_ONBOARDING);
  });

  it('walks back, stopping at the first step', () => {
    expect(prevPath('/onboarding/role')).toBe('/onboarding/profile');
    expect(prevPath('/onboarding/profile')).toBeNull();
  });

  it('maps role intents to additive roles', () => {
    expect(INTENT_TO_ROLE.find).toBe('customer');
    expect(INTENT_TO_ROLE.sell).toBe('seller');
    expect(INTENT_TO_ROLE.business).toBe('vendor');
  });
});
