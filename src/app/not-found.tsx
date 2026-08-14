/**
 * Root 404 (App Router convention) — branded empty state, not a dead end (NEXTJS_ARCHITECTURE.md §7).
 */
import Link from 'next/link';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/primitives/Button';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center' }}>
      <EmptyState
        icon="🗺️"
        title="Nothing here"
        description="This page moved or never existed."
        action={
          <Link href="/map">
            <Button variant="primary">Back to the map</Button>
          </Link>
        }
      />
    </div>
  );
}
