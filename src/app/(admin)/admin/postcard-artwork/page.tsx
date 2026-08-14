import type { Metadata } from 'next';
import { ModerationQueuePanel } from '@/features/postcards';

export const metadata: Metadata = { title: 'Postcard artwork review' };

/**
 * Artwork awaiting review before it can be printed and posted (F-7).
 *
 * Deliberately its own screen rather than a tab inside the vendor tools: the reviewer must not be
 * the person who uploaded the design, which is the entire value of the gate.
 */
export default function PostcardArtworkPage() {
  return <ModerationQueuePanel />;
}
