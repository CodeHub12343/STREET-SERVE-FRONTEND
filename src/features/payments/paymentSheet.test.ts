import { describe, expect, it } from 'vitest';

import { toFailure } from './components/PaymentSheet';

/**
 * The bug this guards against, found while paying for a promotion:
 *
 * `confirmPayment` returns an error for INCOMPLETE FIELDS just as it does for a refused card, and
 * this form used to discard the error and report both as "Payment declined — try a different
 * method". Someone who pressed Pay a moment early was told their bank had refused a charge that was
 * never sent, and went looking for another card to fix a typo.
 *
 * These are cheap tests over a pure function, and they exist because the wrong version of this was
 * indistinguishable from the right one until a human hit it.
 */
describe('classifying a payment failure', () => {
  it('treats incomplete fields as incomplete, NOT as a decline', () => {
    const f = toFailure({ type: 'validation_error', message: "Your card's security code is incomplete." });

    expect(f.kind).toBe('incomplete');
    // Stripe's own wording is more specific than anything we would write.
    expect(f.message).toMatch(/security code is incomplete/i);
  });

  it('does not claim "nothing was taken" when nothing was ever attempted', () => {
    // That reassurance is about a charge that was tried and refused. Saying it here implies a
    // charge happened, which is its own small dishonesty.
    const f = toFailure({ type: 'validation_error', message: 'Your card number is incomplete.' });
    expect(f.message).not.toMatch(/nothing was taken/i);
  });

  it('reports a real decline as a decline, and reassures that no money moved', () => {
    const f = toFailure({ type: 'card_error', message: 'Your card was declined.' });

    expect(f.kind).toBe('declined');
    expect(f.message).toMatch(/declined/i);
    expect(f.message).toMatch(/nothing was taken/i);
  });

  it('does not leak internal errors to the buyer, but still says no money moved', () => {
    const f = toFailure({ type: 'api_error', message: 'Internal connector timeout at shard 7' });

    expect(f.kind).toBe('error');
    expect(f.message).not.toMatch(/shard 7/);
    expect(f.message).toMatch(/nothing was taken/i);
  });

  it('survives an error with no type or message at all', () => {
    const f = toFailure({});
    expect(f.kind).toBe('error');
    expect(f.message.length).toBeGreaterThan(0);
  });
});
