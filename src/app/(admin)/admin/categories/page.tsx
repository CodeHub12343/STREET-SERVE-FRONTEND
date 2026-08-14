import type { Metadata } from 'next';
import { CategoryReview } from '@/features/admin';

export const metadata: Metadata = { title: 'Category & license review' };

export default function CategoriesPage() {
  return <CategoryReview />;
}
