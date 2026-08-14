/**
 * Phase D demo fixtures (gated by NEXT_PUBLIC_MAP_DEMO).
 *
 * Models a seller MID-journey rather than at either end: one course passed, one certification still
 * outstanding, a half-filled profile. That's the state the screens exist to move someone out of.
 */
import type {
  CourseDetail,
  CourseResult,
  CourseSummary,
  Credentials,
  EarnFeed,
  SellerProfile,
} from './types';

let passed = new Set<string>(['selling-basics']);

export function resetDemoAcademy(): void {
  passed = new Set(['selling-basics']);
}

const BASE: Array<Omit<CourseSummary, 'passed' | 'scorePercent' | 'completedAt'>> = [
  {
    slug: 'resident-starter',
    version: 'v1',
    title: 'Before you start selling',
    summary: 'How consignment works, returns, cash vs card, and where your money goes.',
    estimatedMinutes: 6,
    passMark: 70,
    moduleCount: 4,
    questionCount: 6,
    certification: null,
    prerequisites: [],
    requiredFor: 'Shelter partner programme',
    needsRetake: false,
    locked: false,
    missingPrerequisites: [],
  },
  {
    slug: 'selling-basics',
    version: 'v1',
    title: 'Selling on the street',
    summary: 'Opening lines, handling a no, and reading a pitch that isn’t working.',
    estimatedMinutes: 8,
    passMark: 70,
    moduleCount: 2,
    questionCount: 3,
    certification: null,
    prerequisites: [],
    requiredFor: null,
    needsRetake: false,
    locked: false,
    missingPrerequisites: [],
  },
  {
    slug: 'inventory-handling',
    version: 'v1',
    title: 'Handling stock properly',
    summary: 'Checking in, transporting, and returning goods that aren’t yours — certified.',
    estimatedMinutes: 10,
    passMark: 80,
    moduleCount: 3,
    questionCount: 4,
    certification: { key: 'certified-handler', label: 'Certified Handler' },
    prerequisites: [],
    requiredFor: null,
    needsRetake: false,
    locked: false,
    missingPrerequisites: [],
  },
];

export function demoCourses(): CourseSummary[] {
  return BASE.map((c) => ({
    ...c,
    passed: passed.has(c.slug),
    scorePercent: passed.has(c.slug) ? 100 : null,
    completedAt: passed.has(c.slug) ? new Date(Date.now() - 86_400_000).toISOString() : null,
  }));
}

export function demoCourse(slug: string): CourseDetail {
  const summary = demoCourses().find((c) => c.slug === slug) ?? demoCourses()[0]!;
  return {
    ...summary,
    modules: [
      {
        slug: 'transport',
        title: 'Carrying it safely',
        body: [
          'Heavy at the bottom, fragile at the top, nothing loose. A single broken item can cost more than a day’s earnings.',
          'Never leave stock unattended. Lost and stolen goods are charged at their full value.',
        ],
        questions: [
          {
            id: 'q1',
            prompt: 'Who pays for stock that goes missing while it’s out with you?',
            options: ['The hub', 'The platform', 'You, at its full value'],
          },
        ],
      },
    ],
  };
}

export function demoSubmitCourse(slug: string, correct: boolean): Promise<CourseResult> {
  const course = demoCourses().find((c) => c.slug === slug)!;
  if (correct) passed.add(slug);
  return Promise.resolve({
    courseSlug: slug,
    passed: correct,
    scorePercent: correct ? 100 : 0,
    correctCount: correct ? 1 : 0,
    totalCount: 1,
    passMark: course.passMark,
    certificationAwarded: correct ? course.certification : null,
    results: [
      {
        moduleSlug: 'transport',
        questionId: 'q1',
        correct,
        explanation: 'Lost stock is charged to the person holding it. That’s why unattended is never worth it.',
      },
    ],
  });
}

export function demoCredentials(): Credentials {
  const badges = demoCourses()
    .filter((c) => c.passed)
    .map((c) => ({
      courseSlug: c.slug,
      title: c.title,
      earnedAt: c.completedAt!,
      scorePercent: c.scorePercent!,
    }));
  const certifications = demoCourses()
    .filter((c) => c.passed && c.certification)
    .map((c) => ({
      key: c.certification!.key,
      label: c.certification!.label,
      courseSlug: c.slug,
      earnedAt: c.completedAt!,
      current: true,
    }));
  return { badges, certifications, coursesCompleted: badges.length };
}

export function demoSellerProfile(): SellerProfile {
  return {
    userId: 'usr_demo',
    skills: ['talking_to_people'],
    venues: ['farmers_markets'],
    // Deliberately null: `complete` is false, so the "finish your profile" nudge is visible.
    transport: null,
    availableHours: [10, 11, 12, 17, 18],
    bio: null,
    inferred: {
      categories: ['shopping'],
      sellThrough: 4.2,
      activeHours: [11, 12],
      computedAt: new Date().toISOString(),
      sampleSize: 3,
      confidence: 0.375,
    },
    complete: false,
  };
}

export function demoEarnFeed(): EarnFeed {
  return {
    profileComplete: false,
    items: [
      {
        id: 'job:demo1',
        kind: 'gig',
        title: 'Event setup crew',
        subtitle: 'Graceada Summer Fair · 4h',
        expectedPayoutCents: 8_000,
        hoursToPayout: 4,
        distanceM: 800,
        score: 0.82,
        factors: ['pay agreed before you start', 'pays well for the time', 'pays out today'],
        reasonSummary:
          'Ranked because: pay agreed before you start; pays well for the time; pays out today.',
        href: '/seller/jobs/job_demo_setup',
      },
      {
        id: 'product:demo1',
        kind: 'consignment',
        title: 'Soy candles',
        subtitle: '24 available · you keep 65%',
        expectedPayoutCents: 598,
        hoursToPayout: 24,
        distanceM: 420,
        score: 0.54,
        factors: ['no money needed upfront', 'close to you', 'matches what you sell'],
        reasonSummary:
          'Ranked because: no money needed upfront; close to you; matches what you sell.',
        href: '/seller/product/p_demo_1',
      },
      {
        id: 'product:demo2',
        kind: 'consignment',
        title: 'Beaded bracelets',
        subtitle: '40 available · you keep 70%',
        expectedPayoutCents: 322,
        hoursToPayout: 24,
        distanceM: 1_900,
        score: 0.41,
        factors: ['no money needed upfront'],
        reasonSummary: 'Ranked because: no money needed upfront.',
        href: '/seller/product/p_demo_2',
      },
    ],
  };
}
