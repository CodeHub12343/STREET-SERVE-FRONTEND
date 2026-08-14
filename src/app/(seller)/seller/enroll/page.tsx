import type { Metadata } from 'next';
import { ResidentClaim } from '@/features/shelter';

export const metadata: Metadata = { title: 'Enter your code' };

/**
 * B-6: the resident's entry point. Deliberately its own route rather than a step inside seller
 * onboarding — a resident arrives here having been told "open the app and type this code", and
 * anything between them and that input is a place to drop out.
 */
export default function ResidentEnrollPage() {
  return <ResidentClaim />;
}
