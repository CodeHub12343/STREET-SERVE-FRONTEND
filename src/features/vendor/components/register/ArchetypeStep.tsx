'use client';

/**
 * V-01c — the step that makes registration feel built for one business.
 *
 * Four variants selected by the category's archetype: a food truck adds a menu item and is never
 * asked about appointments; a mechanic sets a callout rate and never sees the word "menu".
 * Every variant is skippable — anything skipped becomes a setup-checklist item rather than a wall
 * (BUSINESS_REGISTRATION_REDESIGN.md §3).
 */
import styled from 'styled-components';
import { Input } from '@/components/primitives/Input';
import { formatCents } from '@/lib/money';
import { PhotoPicker } from '../PhotoPicker';
import type { Archetype } from '../../hooks/useBusinessModules';

export interface ArchetypeDraft {
  /** counter_serve → menu item · goods_seller → product · services → service name */
  itemName: string;
  priceCents: string;
  /** appointment/on-demand only. */
  durationMin: string;
  travelFeeCents: string;
  /** The listing photo — menu items, products, and services all support one. */
  photoUrl?: string;
}

export interface ArchetypeStepProps {
  archetype: Archetype;
  businessName: string;
  draft: ArchetypeDraft;
  onDraft: (next: ArchetypeDraft) => void;
}

const COPY: Record<
  Archetype,
  { title: string; body: string; nameLabel: string; namePlaceholder: string; photoHint: string }
> = {
  counter_serve: {
    title: 'Add your first menu item',
    body: 'One is enough to go live — you can build out the full menu later.',
    nameLabel: 'Item name',
    namePlaceholder: 'Birria Tacos (3)',
    photoHint: 'A photo of the dish. Optional — you can add one later.',
  },
  appointment_service: {
    title: 'Add your first service',
    body: 'What you do, how long it takes, and what it costs. Customers book this.',
    nameLabel: 'Service name',
    namePlaceholder: 'Men’s haircut',
    photoHint: 'A photo of your work. Optional — you can add one later.',
  },
  on_demand_service: {
    title: 'What do you do, and what do you charge?',
    body: 'Customers wave you down when they need help — this is what they see.',
    nameLabel: 'Service name',
    namePlaceholder: 'Roadside battery jump',
    photoHint: 'A photo of your work. Optional — you can add one later.',
  },
  goods_seller: {
    title: 'Add your first product',
    body: 'One is enough to go live — you can add the rest of your catalog later.',
    nameLabel: 'Product name',
    namePlaceholder: 'Hand-thrown mug',
    photoHint: 'A photo of the product. Optional — you can add one later.',
  },
};

const toCents = (v: string): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export function ArchetypeStep({ archetype, businessName, draft, onDraft }: ArchetypeStepProps) {
  const copy = COPY[archetype];
  const set = (patch: Partial<ArchetypeDraft>) => onDraft({ ...draft, ...patch });
  const showsDuration = archetype === 'appointment_service';
  const showsTravel = archetype === 'appointment_service' || archetype === 'on_demand_service';
  const priceCents = toCents(draft.priceCents);

  return (
    <Wrap>
      <Head>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </Head>

      <PhotoRow>
        <PhotoPicker
          value={draft.photoUrl}
          onChange={(url) => set({ photoUrl: url ?? undefined })}
          size={72}
          label="Add a photo"
        />
        <PhotoHint>{copy.photoHint}</PhotoHint>
      </PhotoRow>

      <Input
        label={copy.nameLabel}
        placeholder={copy.namePlaceholder}
        value={draft.itemName}
        onChange={(e) => set({ itemName: e.target.value })}
      />

      <Row>
        <Input
          label="Price"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="12.00"
          value={draft.priceCents}
          onChange={(e) => set({ priceCents: e.target.value })}
        />
        {showsDuration ? (
          <Input
            label="How long does it take?"
            type="number"
            inputMode="numeric"
            min="5"
            step="5"
            placeholder="30"
            hint="Minutes"
            value={draft.durationMin}
            onChange={(e) => set({ durationMin: e.target.value })}
          />
        ) : null}
      </Row>

      {showsTravel ? (
        <Input
          label="Call-out fee"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          hint="What you charge to come to the customer. Leave blank if you don’t charge one."
          value={draft.travelFeeCents}
          onChange={(e) => set({ travelFeeCents: e.target.value })}
        />
      ) : null}

      {/* Configuration with visible consequence — this is the customer's view of what you typed. */}
      <Preview aria-label="Customer preview">
        <PreviewTag>Customers will see</PreviewTag>
        <PreviewCard>
          {draft.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <PreviewPhoto src={draft.photoUrl} alt="" />
          ) : null}
          <PreviewBody>
            <PreviewName>{draft.itemName.trim() || copy.namePlaceholder}</PreviewName>
            <PreviewMeta>
              {businessName.trim() || 'Your business'}
              {showsDuration && draft.durationMin ? ` · ${draft.durationMin} min` : ''}
            </PreviewMeta>
            <PreviewPrice className="tnum">
              {priceCents === null ? '—' : formatCents(priceCents)}
            </PreviewPrice>
          </PreviewBody>
        </PreviewCard>
      </Preview>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.div`
  display: grid;
  gap: 4px;
  h2 {
    font-size: 18px;
  }
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Row = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr 1fr;
`;
const PhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PhotoHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Preview = styled.div`
  display: grid;
  gap: 6px;
`;
const PreviewTag = styled.p`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const PreviewCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const PreviewPhoto = styled.img`
  width: 56px;
  height: 56px;
  flex: none;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const PreviewBody = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;
const PreviewName = styled.p`
  font-weight: 750;
  font-size: 15px;
`;
const PreviewMeta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PreviewPrice = styled.p`
  font-size: 18px;
  font-weight: 800;
  margin-top: 4px;
`;
