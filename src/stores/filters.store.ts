/**
 * Map discovery filters (STATE_MANAGEMENT.md §5). Active category tab + search text; persisted
 * so the selection survives sessions (docs/13 C-10, FR-1.3).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CategoryTab = 'all' | 'food' | 'coffee' | 'services' | 'shopping';

interface FiltersState {
  category: CategoryTab;
  search: string;
  setCategory: (category: CategoryTab) => void;
  setSearch: (search: string) => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      category: 'all',
      search: '',
      setCategory: (category) => set({ category }),
      setSearch: (search) => set({ search }),
    }),
    { name: 'ss-filters', partialize: (s) => ({ category: s.category }) },
  ),
);
