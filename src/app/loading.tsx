/**
 * Root loading fallback (docs/06 §2.6e) — skeleton, never a spinner for content.
 */
import { Skeleton } from '@/components/feedback/Skeleton';

export default function Loading() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 560, margin: '0 auto' }}>
      <Skeleton $w="40%" $h="28px" />
      <Skeleton $h="120px" $radius={16} />
      <Skeleton $w="80%" />
      <Skeleton $w="60%" />
    </div>
  );
}
