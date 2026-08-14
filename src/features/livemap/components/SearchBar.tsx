'use client';

/**
 * Persistent map search field (docs/06 §2.5a). Debounced so typing doesn't hammer /map/nearby.
 */
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { useFiltersStore } from '@/stores/filters.store';

export function SearchBar() {
  const search = useFiltersStore((s) => s.search);
  const setSearch = useFiltersStore((s) => s.setSearch);
  const [value, setValue] = useState(search);

  useEffect(() => {
    const id = setTimeout(() => setSearch(value), 300);
    return () => clearTimeout(id);
  }, [value, setSearch]);

  return (
    <Input
      surface="glass"
      aria-label="Search businesses or services"
      placeholder="Search businesses or services"
      leadingIcon={<Search size={16} />}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
