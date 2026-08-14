/**
 * Academy + seller profile + earn hub contracts (Phase D).
 *
 * The course shapes intentionally mirror B-5's resident training: same table, same grading posture,
 * so the resident starter course is simply course #1 in this catalog rather than a special case.
 */
import type { Cents } from '@/types';

// ─── D-3 ────────────────────────────────────────────────────────────────────────────────────
export interface CourseSummary {
  slug: string;
  version: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  passMark: number;
  moduleCount: number;
  questionCount: number;
  /** Non-null only for courses that gate real access (D-5). */
  certification: { key: string; label: string } | null;
  prerequisites: string[];
  /** e.g. "Shelter partner programme" — presentational only. */
  requiredFor: string | null;
  passed: boolean;
  scorePercent: number | null;
  completedAt: string | null;
  /** Passed an older version — the content changed, so it needs retaking. */
  needsRetake: boolean;
  locked: boolean;
  missingPrerequisites: string[];
}

export interface CourseQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface CourseModule {
  slug: string;
  title: string;
  body: string[];
  questions: CourseQuestion[];
}

export interface CourseDetail extends CourseSummary {
  modules: CourseModule[];
}

export interface CourseAnswer {
  moduleSlug: string;
  questionId: string;
  answerIndex: number;
}

export interface CourseResult {
  courseSlug: string;
  passed: boolean;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  passMark: number;
  certificationAwarded: { key: string; label: string } | null;
  /** Every question, right or wrong — the explanation is the teaching. */
  results: Array<{
    moduleSlug: string;
    questionId: string;
    correct: boolean;
    explanation: string;
  }>;
}

// ─── D-4 ────────────────────────────────────────────────────────────────────────────────────
export interface Credentials {
  badges: Array<{
    courseSlug: string;
    title: string;
    earnedAt: string;
    scorePercent: number;
  }>;
  certifications: Array<{
    key: string;
    label: string;
    courseSlug: string;
    earnedAt: string;
    /** False when the course was revised — a retake is needed to keep it valid for gating. */
    current: boolean;
  }>;
  coursesCompleted: number;
}

// ─── D-2 ────────────────────────────────────────────────────────────────────────────────────
export type SellerSkill = string;
export type SellerVenue = string;
export type SellerTransport = 'on_foot' | 'bike' | 'transit' | 'car' | 'van';

export interface SellerProfile {
  userId: string;
  skills: SellerSkill[];
  venues: SellerVenue[];
  transport: SellerTransport | null;
  availableHours: number[];
  bio: string | null;
  /**
   * Kept separate from the declared fields on purpose: when what someone says disagrees with what
   * they do, that disagreement is the signal — and they should be able to see both.
   */
  inferred: {
    categories: string[];
    sellThrough: number | null;
    activeHours: number[];
    computedAt: string | null;
    sampleSize: number;
    confidence: number;
  };
  complete: boolean;
}

export interface ProfileOptions {
  skills: string[];
  venues: string[];
  transport: string[];
}

// ─── D-1 ────────────────────────────────────────────────────────────────────────────────────
export type OpportunityKind = 'consignment' | 'gig' | 'promotion';

/**
 * One way to earn. Both ranking axes are on the row itself rather than folded into `score`, because
 * someone choosing between "$18 now" and "$90 after a shift" is making that trade explicitly.
 */
export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  subtitle: string;
  /** What they keep, net of platform fees. Per UNIT for consignment — never the whole pickup. */
  expectedPayoutCents: Cents;
  hoursToPayout: number;
  distanceM: number | null;
  score: number;
  factors: string[];
  reasonSummary: string;
  href: string;
}

export interface EarnFeed {
  items: Opportunity[];
  profileComplete: boolean;
}
