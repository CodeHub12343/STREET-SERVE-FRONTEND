/**
 * Rent-to-Own demo fixtures — mirror the backend rto pricing so the disclosure + dashboard work
 * offline. Kept in its own file to avoid growing the main demo module.
 */
import type { RtoDashboard, RtoDisclosure, RtoQuoteInput, RtoStatements } from '@/types/rto';

export function demoRtoDisclosure(input: RtoQuoteInput): RtoDisclosure {
  const cash = input.cashPriceCents;
  const initial = Math.min(input.initialPaymentCents, cash);
  const markup = Math.floor((cash * input.markupBps) / 10000);
  const total = cash + markup;
  const financed = total - initial;
  const n = input.installmentCount;
  const amount = n > 0 ? Math.ceil(financed / n) : 0;
  const ownership = n > 0 ? Math.floor((cash - initial) / n) : 0;
  const schedule = Array.from({ length: n }, (_, i) => ({
    installmentNumber: i + 1,
    amountCents: amount,
    ownershipCreditCents: ownership,
    rentalCents: amount - ownership,
    feeCents: Math.floor((amount * 1000) / 10000),
  }));
  return {
    cashPriceCents: cash,
    initialPaymentCents: initial,
    totalToOwnCents: total,
    costOverCashCents: markup,
    installmentAmountCents: amount,
    installmentCount: n,
    frequency: input.frequency,
    graceDays: 3,
    setupFeeCents: input.setupFeeCents ?? 0,
    lateFeeCents: input.lateFeeCents ?? 0,
    schedule,
    disclosure: `You'll pay $${(total / 100).toFixed(2)} total to own this — $${(markup / 100).toFixed(2)} more than the cash price. Rent-to-own may cost more than buying outright.`,
    // §44's conservative defaults, mirroring DEFAULT_RTO_LISTING_TERMS on the server.
    listingTerms: {
      maintenanceResponsibility: 'customer',
      damageResponsibility: 'customer',
      returnAllowed: false,
      returnTransportResponsibility: 'customer',
      restockingFeeCents: 0,
      paymentsRefundableOnReturn: false,
      ownershipCreditPreservedOnReturn: false,
      reinstatementAllowed: true,
      cancellationNoticeDays: 7,
      deliveryFeeCents: 0,
      taxBps: 0,
    },
    obligations: [
      'You are responsible for maintaining the item.',
      'You are responsible for loss or damage while you have it.',
      'This agreement does not offer a voluntary return before the term ends.',
      "To cancel, give 7 days' notice.",
    ],
  };
}

export function demoRtoDashboard(id: string): RtoDashboard {
  const cash = 10000;
  const credited = 4000;
  return {
    id,
    productName: 'Refurbished Laptop',
    status: 'active',
    cashPriceCents: cash,
    totalToOwnCents: 11000,
    installmentAmountCents: 2250,
    installmentCount: 4,
    installmentsPaid: 1,
    ownershipCreditedCents: credited,
    proofOfOwnership: null,
    isConsignment: true,
    nextDueAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    installmentsRemaining: 3,
    ownershipPercent: Math.round((credited / cash) * 100),
    payoffCents: cash - credited,
  };
}

export function demoRtoAgreements(): RtoDashboard[] {
  return [demoRtoDashboard('rto_demo')];
}

export function demoRtoStatements(id: string): RtoStatements {
  // A $100 installment split: platform 10% / commission 30% of distributable / owner the rest.
  const line = (role: string, amountCents: number) => ({ installmentNumber: 1, role, amountCents, at: new Date().toISOString() });
  return {
    agreementId: id,
    isConsignment: true,
    parties: {
      owner: { totalCents: 6300, lines: [line('owner share', 6300)] },
      managing_business: { totalCents: 2700, lines: [line('commission', 2700)] },
      platform: { totalCents: 1000, lines: [line('platform fee', 1000)] },
    },
    reconciliation: { splitTotalCents: 10000, grossCollectedCents: 10000, clean: true },
  };
}
