import { describe, expect, it } from 'vitest';
import { __notificationMap } from './hooks/useNotifications';

const { toUiCategory, toDeeplink } = __notificationMap;

/**
 * Notifications were inert: the API sends `createdAt` (not `at`) and a `data` bag with no
 * `deeplink`, so every row showed "NaN min ago" and tapping did nothing. These pin the mapping
 * that makes a tap land somewhere — the exact two the user hit (wave_down, message) plus the
 * shared-category vendor/customer split.
 */

describe('deeplink derivation', () => {
  it('a message opens its thread', () => {
    expect(toDeeplink('message', { threadId: 'th_9' })).toBe('/messages/th_9');
  });

  it('an incoming wave down (vendor) opens the wave inbox', () => {
    expect(toDeeplink('wave_down', { waveDownId: 'w1', audience: 'vendor' })).toBe('/vendor/wave-downs');
  });

  it("a customer's wave update opens their tracker", () => {
    expect(toDeeplink('wave_down', { waveDownId: 'w1' })).toBe('/wave/w1');
  });

  it('the same category routes by audience, not guesswork', () => {
    expect(toDeeplink('order', { orderId: 'o1', audience: 'vendor' })).toBe('/vendor/orders');
    expect(toDeeplink('order', { orderId: 'o1' })).toBe('/orders');
    expect(toDeeplink('booking', { bookingId: 'b1', audience: 'vendor' })).toBe('/vendor/bookings');
    // The customer's landing is their booking detail — /booking with no id is a 404.
    expect(toDeeplink('booking', { bookingId: 'b1' })).toBe('/booking/b1');
    expect(toDeeplink('license', { businessId: 'biz1' })).toBe('/vendor/license');
  });

  it('static-destination categories route without an id', () => {
    expect(toDeeplink('payout', {})).toBe('/profile/wallet');
    expect(toDeeplink('verification', null)).toBe('/profile/verification');
  });

  it('degrades to a safe base when the id is missing, never a broken /undefined path', () => {
    expect(toDeeplink('message', {})).toBe('/messages');
    expect(toDeeplink('wave_down', { audience: 'vendor' })).toBe('/vendor/wave-downs');
    expect(toDeeplink('wave_down', {})).toBeUndefined(); // customer wave with no id → no dead link
  });

  it('an unknown category has no destination rather than a wrong one', () => {
    expect(toDeeplink('system', {})).toBeUndefined();
    expect(toDeeplink('mystery', { x: 1 })).toBeUndefined();
  });
});

describe('category → icon vocabulary', () => {
  it('folds the backend vocabulary onto the seven the center renders', () => {
    expect(toUiCategory('wave_down')).toBe('wave');
    expect(toUiCategory('popup_delay')).toBe('wave');
    expect(toUiCategory('booking')).toBe('order');
    expect(toUiCategory('order')).toBe('order');
    expect(toUiCategory('message')).toBe('message');
    expect(toUiCategory('payout')).toBe('payout');
    expect(toUiCategory('verification')).toBe('verification');
    expect(toUiCategory('dispute')).toBe('dispute');
  });

  it('maps anything unrecognised to system so it still gets an icon', () => {
    expect(toUiCategory('brand_new_thing')).toBe('system');
  });
});
