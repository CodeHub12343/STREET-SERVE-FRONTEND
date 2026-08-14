'use client';

/**
 * Category tab row (docs/06 §2.5a) — All / Food / Coffee / Services / Shopping. Selection persists
 * across sessions via the filters store (FR-1.3). The full taxonomy behind "More" (C-13) lands in
 * a later milestone.
 */
import { Tabs, type TabItem } from '@/components/primitives/Tabs';
import { useFiltersStore, type CategoryTab } from '@/stores/filters.store';

const TABS: TabItem[] = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'services', label: 'Services' },
  { value: 'shopping', label: 'Shopping' },
];

export function CategoryTabs() {
  const category = useFiltersStore((s) => s.category);
  const setCategory = useFiltersStore((s) => s.setCategory);
  return (
    <Tabs
      surface="glass"
      ariaLabel="Categories"
      items={TABS}
      value={category}
      onChange={(v) => setCategory(v as CategoryTab)}
    />
  );
}
