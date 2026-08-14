'use client';

/**
 * A-03 approval dialog (BP-5). Approving a taxonomy suggestion is a governance act, not a rubber
 * stamp: the admin chooses the **archetype** (what the category behaves like — which decides every
 * default module for every business that ever registers under it) and the compliance metadata
 * (licence + regulator, which gates go-live).
 *
 * Both have safe defaults so an obvious approval stays fast, but the consequences are stated in
 * the UI rather than buried in a matrix doc.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Modal } from '@/components/primitives/Modal';
import { Select } from '@/components/primitives/Select';
import { Switch } from '@/components/primitives/Switch';
import type { AdminCategorySuggestion, Archetype, CategoryTab } from '../hooks/useAdmin';

/** The governance choices the dialog collects. The id + approve flag belong to the caller. */
export interface ApprovalDetails {
  topLevelTab: CategoryTab;
  archetype: Archetype;
  requiresLicense: boolean;
  regulatedBy?: string;
}

const TABS: { value: CategoryTab; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'coffee', label: 'Coffee & drinks' },
  { value: 'services', label: 'Services' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'more', label: 'More' },
];

/** Mirrors the server's DEFAULT_ARCHETYPE_BY_TAB so the preselection matches what approval does. */
const DEFAULT_ARCHETYPE_BY_TAB: Record<CategoryTab, Archetype> = {
  food: 'counter_serve',
  coffee: 'counter_serve',
  services: 'on_demand_service',
  shopping: 'goods_seller',
  more: 'goods_seller',
};

const ARCHETYPES: { value: Archetype; label: string; hint: string }[] = [
  {
    value: 'counter_serve',
    label: 'Counter-serve — sells product on the spot',
    hint: 'Gets a menu, orders, a line-up queue and wave-downs. Like a food truck.',
  },
  {
    value: 'appointment_service',
    label: 'Appointment service — booked ahead',
    hint: 'Gets services and bookings. Never a menu. Like a barber.',
  },
  {
    value: 'on_demand_service',
    label: 'On-demand service — dispatched now',
    hint: 'Gets services and wave-downs. Never a menu. Like a locksmith.',
  },
  {
    value: 'goods_seller',
    label: 'Goods seller — physical products',
    hint: 'Gets a product list, orders and consignment. Like a handmade stall.',
  },
];

export interface SuggestionReviewModalProps {
  suggestion: AdminCategorySuggestion;
  pending: boolean;
  onCancel: () => void;
  onApprove: (details: ApprovalDetails) => void;
}

export function SuggestionReviewModal({
  suggestion,
  pending,
  onCancel,
  onApprove,
}: SuggestionReviewModalProps) {
  const [tab, setTab] = useState<CategoryTab>('services');
  const [archetype, setArchetype] = useState<Archetype>(DEFAULT_ARCHETYPE_BY_TAB.services);
  const [requiresLicense, setRequiresLicense] = useState(false);
  const [regulatedBy, setRegulatedBy] = useState('');
  // Track whether the admin has overridden the archetype; until then it follows the tab.
  const [archetypeTouched, setArchetypeTouched] = useState(false);

  const pickTab = (value: CategoryTab) => {
    setTab(value);
    if (!archetypeTouched) setArchetype(DEFAULT_ARCHETYPE_BY_TAB[value]);
  };

  const chosen = ARCHETYPES.find((a) => a.value === archetype);

  return (
    <Modal open title={`Approve “${suggestion.proposedName}”?`} onClose={onCancel}>
      <Body>
        <Sub>Suggested by {suggestion.businessName}</Sub>
        {suggestion.justification ? <Quote>“{suggestion.justification}”</Quote> : null}

        <Select
          label="Where does it belong?"
          value={tab}
          options={TABS}
          onChange={(e) => pickTab(e.target.value as CategoryTab)}
        />

        <Field>
          <Select
            label="What does it behave like?"
            value={archetype}
            options={ARCHETYPES.map((a) => ({ value: a.value, label: a.label }))}
            onChange={(e) => {
              setArchetypeTouched(true);
              setArchetype(e.target.value as Archetype);
            }}
          />
          {chosen ? <Hint>{chosen.hint}</Hint> : null}
        </Field>

        <Field>
          <SwitchRow>
            <Switch
              checked={requiresLicense}
              label="Requires a licence"
              onChange={setRequiresLicense}
            />
            <SwitchLabel>
              <ShieldAlert size={13} aria-hidden /> Requires a licence
            </SwitchLabel>
          </SwitchRow>
          <Hint>
            Businesses in this category won’t be able to go live until an admin approves their
            licence document.
          </Hint>
        </Field>

        {requiresLicense ? (
          <Input
            label="Regulated by"
            placeholder="e.g. CA Board of Barbering and Cosmetology"
            value={regulatedBy}
            onChange={(e) => setRegulatedBy(e.target.value)}
            hint="Shown to vendors so they know which licence to upload."
          />
        ) : null}

        <Button
          fullWidth
          loading={pending}
          onClick={() =>
            onApprove({
              topLevelTab: tab,
              archetype,
              requiresLicense,
              ...(requiresLicense && regulatedBy.trim() ? { regulatedBy: regulatedBy.trim() } : {}),
            })
          }
        >
          Approve category
        </Button>
        <Button variant="tertiary" fullWidth disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </Body>
    </Modal>
  );
}

const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Quote = styled.blockquote`
  font-size: 13px;
  font-style: italic;
  color: ${({ theme }) => theme.color.textSecondary};
  padding-left: ${({ theme }) => theme.space[3]}px;
  border-left: 2px solid ${({ theme }) => theme.color.line2};
`;
const Field = styled.div`
  display: grid;
  gap: 6px;
`;
const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
const SwitchLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 650;
`;
