/**
 * Demo fixtures for the Shelter Partner Program (gated by NEXT_PUBLIC_MAP_DEMO).
 *
 * Deliberately models the MIDDLE of the journey rather than a clean end state: a resident who has
 * claimed their code but not finished training, with money already waiting at the front desk. That
 * combination is what the screens exist to explain, so it's what the demo should show.
 */
import type {
  ClaimResult,
  CustodyLedger,
  MyCustody,
  ResidentCapabilities,
  TrainingAnswer,
  TrainingCourse,
  TrainingResult,
} from './types';

const ORG = 'Hope Center Modesto';

let state = {
  claimed: true,
  trainingPassed: false,
};

export function resetDemoShelter(): void {
  state = { claimed: true, trainingPassed: false };
}

export function demoResident(): ResidentCapabilities | null {
  if (!state.claimed) return null;
  return {
    partnerId: 'shelter_demo_1',
    organizationName: ORG,
    enrollmentId: 'enr_demo_1',
    cosignedAllocationCents: 5_000,
    allocationUsedCents: 2_000,
    allocationRemainingCents: 3_000,
    maxInventoryValueCents: 5_000,
    maxCashDebtCents: 5_000,
    maxHubDistanceM: 25_000,
    shelterLocation: [-120.9969, 37.6391],
    trainingComplete: state.trainingPassed,
    starterGrantAvailable: true,
    custodyEnabled: true,
    collectionNote: 'Ask for Dana at the front desk, 9am–7pm',
  };
}

export function demoClaim(code: string): Promise<ClaimResult> {
  if (code.trim().toUpperCase() === 'BADCODE') {
    return Promise.reject(new Error('That code isn’t valid.'));
  }
  state.claimed = true;
  return Promise.resolve({
    enrollmentId: 'enr_demo_1',
    partnerId: 'shelter_demo_1',
    organizationName: ORG,
    cosignedAllocationCents: 5_000,
    trainingRequired: true,
  });
}

/** Mirrors the backend course, minus answer keys — exactly what the real endpoint serves. */
export function demoCourse(): TrainingCourse {
  return {
    slug: 'resident-starter',
    version: 'v1',
    title: 'Before you start selling',
    questionCount: 6,
    modules: [
      {
        slug: 'how-consignment-works',
        title: 'How this works',
        body: [
          'You take products from a hub without paying for them. You sell what you can, bring back what you don’t, and you keep a share of everything you sell.',
          'You never buy the stock. It stays the hub’s property until it sells — that’s what makes it possible to start with nothing.',
        ],
        questions: [
          {
            id: 'q1',
            prompt: 'Do you have to pay for stock before you can sell it?',
            options: [
              'Yes, you buy it upfront',
              'No — you take it on consignment and pay nothing',
              'Only if it costs more than $20',
            ],
          },
        ],
      },
      {
        slug: 'returning-stock',
        title: 'Bringing stock back',
        body: [
          'Every item has a return date. Bring back anything unsold before that date and you owe nothing on it.',
          'If something goes wrong, tell the hub or your shelter staff before the date. Problems raised early are almost always sorted out.',
        ],
        questions: [
          {
            id: 'q1',
            prompt: 'You have 4 items left and the return date is tomorrow. What should you do?',
            options: [
              'Keep them and try again next week',
              'Return them before the date — you’ll owe nothing',
              'Throw them away',
            ],
          },
          {
            id: 'q2',
            prompt: 'Something has gone wrong and you can’t make the return date. What’s best?',
            options: [
              'Say nothing and hope it’s missed',
              'Tell the hub or your shelter staff before the date',
              'Wait until you’re charged, then explain',
            ],
          },
        ],
      },
      {
        slug: 'cash-and-card',
        title: 'Getting paid, and what you owe',
        body: [
          'If a customer pays by card in the app, the money is split automatically and you owe nothing afterwards.',
          'If a customer pays you in CASH, you are holding the hub’s share too. That part is recorded as owed and comes out of your next card sale.',
        ],
        questions: [
          {
            id: 'q1',
            prompt: 'A customer hands you $20 in cash for an item. What’s true?',
            options: [
              'All $20 is yours to keep',
              'Part of it is the hub’s share, and it’s recorded as owed',
              'You must hand the cash to the hub immediately',
            ],
          },
          {
            id: 'q2',
            prompt: 'Which is better for you?',
            options: ['Cash every time', 'Card in the app', 'No difference'],
          },
        ],
      },
      {
        slug: 'getting-your-money',
        title: 'Where your money goes',
        body: [
          'If you don’t have a bank account, your earnings are sent to your shelter and held for you. The app shows how much is waiting and where to collect it.',
          'That money is yours. The shelter is holding it, not keeping it.',
        ],
        questions: [
          {
            id: 'q1',
            prompt: 'Your shelter is holding $40 of your earnings. Whose money is it?',
            options: ['The shelter’s', 'Yours — they’re holding it for you', 'The platform’s'],
          },
        ],
      },
    ],
  };
}

/** Index 1 is correct for every demo question — keeps the fixture legible. */
const DEMO_CORRECT = 1;

export function demoSubmitTraining(answers: TrainingAnswer[]): Promise<TrainingResult> {
  const course = demoCourse();
  const all = course.modules.flatMap((m) => m.questions.map((q) => ({ m: m.slug, q: q.id })));
  const results = all.map(({ m, q }) => {
    const given = answers.find((a) => a.moduleSlug === m && a.questionId === q);
    return {
      moduleSlug: m,
      questionId: q,
      correct: given?.answerIndex === DEMO_CORRECT,
      explanation: 'Returning unsold stock on time costs you nothing.',
    };
  });
  const correctCount = results.filter((r) => r.correct).length;
  const scorePercent = Math.round((correctCount / all.length) * 100);
  const passed = scorePercent >= 70;
  if (passed) state.trainingPassed = true;
  return Promise.resolve({
    passed,
    scorePercent,
    correctCount,
    totalCount: all.length,
    passMark: 70,
    results,
  });
}

export function demoCustody(): MyCustody {
  return {
    heldCents: 4_820,
    entries: [
      {
        id: 'cus_demo_1',
        amountCents: 4_000,
        status: 'held',
        sourceType: 'job_payout',
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
        disbursedAt: null,
        acknowledged: false,
        organizationName: ORG,
        collectionNote: 'Ask for Dana at the front desk, 9am–7pm',
      },
      {
        id: 'cus_demo_2',
        amountCents: 820,
        status: 'held',
        sourceType: 'sale_payment',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        disbursedAt: null,
        acknowledged: false,
        organizationName: ORG,
        collectionNote: 'Ask for Dana at the front desk, 9am–7pm',
      },
      {
        id: 'cus_demo_3',
        amountCents: 1_500,
        status: 'disbursed',
        sourceType: 'consignment_settlement',
        createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        disbursedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        acknowledged: true,
        organizationName: ORG,
        collectionNote: null,
      },
    ],
  };
}

export function demoCustodyLedger(partnerId: string): CustodyLedger {
  return {
    partnerId,
    heldCents: 4_820,
    entries: [
      {
        id: 'cus_demo_1',
        residentUserId: 'usr_demo_a',
        amountCents: 4_000,
        sourceType: 'job_payout',
        status: 'held',
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
        disbursedAt: null,
        disbursementMethod: null,
        residentAcknowledged: false,
      },
      {
        id: 'cus_demo_2',
        residentUserId: 'usr_demo_b',
        amountCents: 820,
        sourceType: 'sale_payment',
        status: 'held',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        disbursedAt: null,
        disbursementMethod: null,
        residentAcknowledged: false,
      },
    ],
  };
}
