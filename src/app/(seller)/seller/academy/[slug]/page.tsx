'use client';

import { use } from 'react';
import { CoursePlayer } from '@/features/academy';

/** D-3 — taking one course. */
export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <CoursePlayer slug={slug} />;
}
