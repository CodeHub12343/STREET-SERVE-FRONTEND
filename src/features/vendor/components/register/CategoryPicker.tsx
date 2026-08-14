'use client';

/**
 * V-01a — the most consequential screen in registration. The category the vendor picks resolves an
 * archetype, which decides the remaining steps, their default modules, and whether a licence gates
 * going live. One question, maximum leverage.
 *
 * A searchable list (not a <select>): the taxonomy is 25 rows today and grows, and a native select
 * stops being usable well before that. Licence is disclosed HERE, before any effort is invested.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Search, ShieldAlert, Check } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { TAB_LABEL, type Category } from '../../registration';

export interface CategoryPickerProps {
  categories: Category[] | undefined;
  isLoading: boolean;
  value: string;
  onChange: (categoryId: string) => void;
  /** "Something else" — captured, then formalised by an admin via /category-suggestions. */
  otherName: string;
  onOtherNameChange: (name: string) => void;
  otherSelected: boolean;
  onSelectOther: () => void;
}

const TAB_ORDER: Category['top_level_tab'][] = ['food', 'coffee', 'services', 'shopping', 'more'];

export function CategoryPicker({
  categories,
  isLoading,
  value,
  onChange,
  otherName,
  onOtherNameChange,
  otherSelected,
  onSelectOther,
}: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Category['top_level_tab'] | 'all'>('all');

  const filtered = useMemo(() => {
    const list = categories ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((c) => (tab === 'all' ? true : c.top_level_tab === tab))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .sort((a, b) => TAB_ORDER.indexOf(a.top_level_tab) - TAB_ORDER.indexOf(b.top_level_tab) || a.name.localeCompare(b.name));
  }, [categories, query, tab]);

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="44px" $radius={8} />
        <Skeleton $h="220px" $radius={16} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Input
        label="What kind of business do you run?"
        placeholder="Search — e.g. taco, barber, mechanic"
        leadingIcon={<Search size={16} />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <Tabs role="tablist" aria-label="Category groups">
        <Tab role="tab" aria-selected={tab === 'all'} $active={tab === 'all'} onClick={() => setTab('all')}>
          All
        </Tab>
        {TAB_ORDER.map((t) => (
          <Tab key={t} role="tab" aria-selected={tab === t} $active={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </Tab>
        ))}
      </Tabs>

      <List role="listbox" aria-label="Business categories">
        {filtered.map((c) => {
          const selected = !otherSelected && value === c._id;
          return (
            <Option
              key={c._id}
              role="option"
              aria-selected={selected}
              $active={selected}
              onClick={() => onChange(c._id)}
            >
              <OptionMain>
                <OptionName>{c.name}</OptionName>
                {c.requires_license ? (
                  <Licence>
                    <ShieldAlert size={12} aria-hidden />
                    Licence needed{c.regulated_by ? ` · ${c.regulated_by}` : ''}
                  </Licence>
                ) : null}
              </OptionMain>
              {selected ? <Check size={16} aria-hidden /> : null}
            </Option>
          );
        })}

        {filtered.length === 0 ? <Empty>No category matches “{query}”.</Empty> : null}

        {/* Never let a missing row block a real business — the backend already has a path for it. */}
        <Option role="option" aria-selected={otherSelected} $active={otherSelected} onClick={onSelectOther}>
          <OptionMain>
            <OptionName>Something else</OptionName>
            <Hint>Tell us what you do and we’ll add it.</Hint>
          </OptionMain>
          {otherSelected ? <Check size={16} aria-hidden /> : null}
        </Option>
      </List>

      {otherSelected ? (
        <Input
          label="What kind of business is it?"
          placeholder="e.g. Mobile bike mechanic"
          required
          value={otherName}
          onChange={(e) => onOtherNameChange(e.target.value)}
          hint="We’ll set you up with the closest match now and add your category properly."
        />
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Tabs = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
`;
const Tab = styled.button<{ $active: boolean }>`
  flex: none;
  height: 32px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${({ theme, $active }) => ($active ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $active }) => ($active ? theme.color.textPrimary : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.surfaceBase : theme.color.textSecondary)};
`;
const List = styled.div`
  display: grid;
  gap: 6px;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 2px;
`;
const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line)};
  color: ${({ theme }) => theme.color.textPrimary};
  &:hover {
    border-color: ${({ theme, $active }) =>
      $active ? theme.color.accentPrimary : theme.color.line2};
  }
`;
const OptionMain = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;
const OptionName = styled.span`
  font-weight: 650;
  font-size: 15px;
`;
const Licence = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Empty = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  padding: ${({ theme }) => theme.space[3]}px;
`;
