'use client';

/**
 * Pick a business by name, for admin controls that act on one.
 *
 * Every such control asked the operator to paste a 24-character Mongo ObjectId. The person running
 * this platform is not a developer and has no way to obtain one — and the failure was silent rather
 * than loud: a USER id pasted into the "business id" field was accepted, recorded, and reported as
 * success, while the seller stayed blocked. The admin screen showed an approval, the vendor's
 * screen showed a refusal, and nothing connected the two.
 *
 * A hex string is unreadable by design, so the operator could not have caught it either. Names can
 * be checked by a human; ids cannot.
 *
 * The owner is shown next to each result because two businesses can share a name, and someone
 * granting a credit-like permission has to know which one they are granting it to.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { useBusinessSearch } from '../hooks/useAdmin';
import type { AdminBusiness } from '../types';

export interface BusinessPickerProps {
  /** The chosen business, or null. Owned by the parent so a submit can clear it. */
  value: AdminBusiness | null;
  onChange: (business: AdminBusiness | null) => void;
  label?: string;
}

export function BusinessPicker({ value, onChange, label = 'Business' }: BusinessPickerProps) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced so typing a name is one request per pause, not one per keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  const results = useBusinessSearch(debounced);

  // A click outside dismisses the list; without it the results sit over the rest of the form.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (value) {
    return (
      <Chosen>
        <ChosenText>
          <ChosenName>
            <Check size={14} aria-hidden /> {value.name}
          </ChosenName>
          <ChosenSub>
            {value.ownerName ?? value.ownerEmail ?? 'owner unknown'}
            {value.status !== 'active' ? ` · ${value.status}` : ''}
          </ChosenSub>
        </ChosenText>
        <Clear type="button" onClick={() => onChange(null)} aria-label="Choose a different business">
          <X size={16} aria-hidden />
        </Clear>
      </Chosen>
    );
  }

  return (
    <Box ref={boxRef}>
      <Input
        label={label}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by business name"
        leadingIcon={<Search size={16} aria-hidden />}
      />
      {open && debounced.trim().length >= 2 ? (
        <Results role="listbox" aria-label="Matching businesses">
          {results.isLoading ? (
            <Empty>Searching…</Empty>
          ) : (results.data ?? []).length === 0 ? (
            <Empty>No business matches “{debounced}”.</Empty>
          ) : (
            (results.data ?? []).map((b) => (
              <Result
                key={b.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange(b);
                  setTerm('');
                  setOpen(false);
                }}
              >
                <ResultName>{b.name}</ResultName>
                <ResultSub>
                  {b.ownerName ?? b.ownerEmail ?? 'owner unknown'}
                  {b.isHub ? ' · hub' : ''}
                  {b.status !== 'active' ? ` · ${b.status}` : ''}
                </ResultSub>
              </Result>
            ))
          )}
        </Results>
      ) : null}
    </Box>
  );
}

const Box = styled.div`
  position: relative;
`;
const Results = styled.div`
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 260px;
  overflow-y: auto;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
const Result = styled.button`
  display: grid;
  gap: 2px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  background: none;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: pointer;
  &:last-child {
    border-bottom: none;
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
const ResultName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ResultSub = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Empty = styled.p`
  padding: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Chosen = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const ChosenText = styled.span`
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const ChosenName = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  svg {
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const ChosenSub = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Clear = styled.button`
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: none;
  border: none;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
`;
