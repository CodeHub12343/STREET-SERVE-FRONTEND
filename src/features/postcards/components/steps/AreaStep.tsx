'use client';

/**
 * Step 2 — where the postcards go.
 *
 * ## The count is asked for, not typed ahead of
 *
 * Resolving an area costs a live vendor call and writes a row, so it happens when the buyer presses
 * a button rather than on every keystroke in the ZIP field. It also means the number on screen is
 * always **the vendor's** count of deliverable addresses — never an estimate of ours, which would
 * later disagree with their invoice after the buyer had been quoted against it (audit F-9).
 *
 * ## Saying plainly that we never see the addresses
 *
 * People are reasonably suspicious of "we will mail 2,000 households near you". The privacy
 * property is real — the vendor resolves, holds and mails the list, and StreetServe only ever
 * receives a count — so it is stated on the screen where the question occurs to someone, rather
 * than buried in a policy (ADR-007 §6).
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { AppApiError } from '@/lib/api/errors';
import { useCreateAudience, useListTypes } from '../../hooks/usePostcards';
import type { AudienceSelectionType, PostcardAudience } from '../../types';

const MODES = [
  { value: 'zip' as const, label: 'ZIP codes' },
  { value: 'carrier_route' as const, label: 'Postal routes' },
  { value: 'radius' as const, label: 'Around an address' },
];

export function AreaStep({
  businessId,
  selectedAudienceId,
  busy,
  onChoose,
}: {
  businessId: string;
  selectedAudienceId: string | null;
  busy: boolean;
  onChoose: (audienceId: string) => void;
}) {
  const listTypes = useListTypes();
  const createAudience = useCreateAudience(businessId);

  const [mode, setMode] = useState<AudienceSelectionType>('zip');
  const [listType, setListType] = useState('');
  const [keysText, setKeysText] = useState('');
  const [radius, setRadius] = useState({ miles: 3, address: '', city: '', state: '', zip: '' });
  const [resolved, setResolved] = useState<PostcardAudience | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveListType = listType || listTypes.data?.[0]?.key || '';

  async function resolveArea(): Promise<void> {
    setError(null);
    setResolved(null);
    try {
      const keys = keysText
        .split(/[\s,]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const audience = await createAudience.mutateAsync(
        mode === 'radius'
          ? { type: 'radius', listType: effectiveListType, radius }
          : { type: mode, listType: effectiveListType, keys },
      );
      setResolved(audience);
    } catch (err) {
      setError(
        err instanceof AppApiError ? err.message : 'We could not look up that area. Try again.',
      );
    }
  }

  return (
    <section aria-labelledby="pc-area-heading">
      <Heading id="pc-area-heading">Choose where to mail</Heading>

      <SegmentedControl
        segments={MODES}
        value={mode}
        onChange={(next: AudienceSelectionType) => {
          setMode(next);
          setResolved(null);
        }}
        ariaLabel="How to choose the area"
      />

      <Fields>
        <Select
          label="Who receives it"
          value={effectiveListType}
          onChange={(e) => setListType(e.target.value)}
          options={(listTypes.data ?? []).map((t) => ({ value: t.key, label: t.label }))}
          hint="Most businesses want the general residents-and-occupants list."
        />

        {mode === 'zip' ? (
          <Input
            label="ZIP codes"
            value={keysText}
            onChange={(e) => setKeysText(e.target.value)}
            placeholder="95350, 95351"
            hint="Separate several with commas."
            inputMode="numeric"
          />
        ) : null}

        {mode === 'carrier_route' ? (
          <Input
            label="Postal routes"
            value={keysText}
            onChange={(e) => setKeysText(e.target.value)}
            placeholder="95350:C002, 95350:C004"
            hint="Route codes look like 95350:C002. Your printer can supply these."
          />
        ) : null}

        {mode === 'radius' ? (
          <>
            <Input
              label="Miles around the address"
              type="number"
              min={1}
              value={String(radius.miles)}
              onChange={(e) => setRadius({ ...radius, miles: Number(e.target.value) })}
            />
            <Input
              label="Street address"
              value={radius.address}
              onChange={(e) => setRadius({ ...radius, address: e.target.value })}
            />
            <Row>
              <Input
                label="City"
                value={radius.city}
                onChange={(e) => setRadius({ ...radius, city: e.target.value })}
              />
              <Input
                label="State"
                value={radius.state}
                onChange={(e) => setRadius({ ...radius, state: e.target.value })}
                maxLength={2}
              />
              <Input
                label="ZIP"
                value={radius.zip}
                onChange={(e) => setRadius({ ...radius, zip: e.target.value })}
                inputMode="numeric"
              />
            </Row>
          </>
        ) : null}
      </Fields>

      <Actions>
        <Button
          variant="secondary"
          onClick={() => void resolveArea()}
          loading={createAudience.isPending}
          disabled={createAudience.isPending}
        >
          Count addresses
        </Button>
      </Actions>

      {error ? (
        <Banner tone="danger" title="We could not look that up">
          {error}
        </Banner>
      ) : null}

      {/**
       * `role="status"` so the count is announced when it lands. It appears after a button press
       * with no other visual change nearby, which is exactly the case a screen-reader user would
       * otherwise miss entirely.
       */}
      {resolved ? (
        <Result role="status">
          <Count>{resolved.recordCount.toLocaleString()}</Count>
          <CountLabel>deliverable addresses in that area</CountLabel>
          <Privacy>
            We never see who they are. Our printing partner holds the mailing list and posts the
            cards — no names or addresses reach StreetServe.
          </Privacy>
          <Button onClick={() => onChoose(resolved.id)} disabled={busy} loading={busy}>
            Mail to this area
          </Button>
        </Result>
      ) : null}

      {selectedAudienceId && !resolved ? (
        <Banner tone="info">
          An area is already attached to this order. Counting a new one will replace it.
        </Banner>
      ) : null}
    </section>
  );
}

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  margin: ${({ theme }) => theme.space[4]}px 0;
`;

const Row = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  grid-template-columns: 2fr 1fr 1fr;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Result = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const Count = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[5]}px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const CountLabel = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Privacy = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
  line-height: ${({ theme }) => theme.typography.lineBody};
`;
