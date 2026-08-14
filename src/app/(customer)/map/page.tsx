import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MapHome } from '@/features/livemap';
import { MapTutorial } from '@/features/identity';

export const metadata: Metadata = { title: 'Map' };

export default function MapPage() {
  return (
    <>
      <MapHome />
      {/* C-09 first-run tutorial overlay (shows when opened with ?tour=1). */}
      <Suspense fallback={null}>
        <MapTutorial />
      </Suspense>
    </>
  );
}
