import type { Metadata } from 'next';
import { FavoritesList } from '@/features/favorites';

export const metadata: Metadata = { title: 'Favorites' };

export default function FavoritesPage() {
  return <FavoritesList />;
}
