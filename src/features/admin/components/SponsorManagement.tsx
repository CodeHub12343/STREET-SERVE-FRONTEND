'use client';

/**
 * A-07 Sponsor management (docs/13 A-07).
 *
 * **This page could only ever be blank.** It called `GET /admin/sponsors`, which did not exist; the
 * request 404'd, the data stayed undefined, and `if (isLoading || !sponsors)` rendered the loading
 * skeleton for ever. A failed request was indistinguishable from a slow one, which is why it looked
 * like it was still thinking rather than broken.
 *
 * Two things the old table also got wrong:
 *
 *  • **"Spend" had no field behind it.** The number came from a demo fixture. It is now a figure an
 *    admin records by hand, and the screen says so — sponsorships are settled off-platform and
 *    nothing here collects money.
 *  • **A sponsorship could never be ended.** `active` was in the model and reachable by nothing, so
 *    an expired term left the logo on the landing page and kept attributing signups to a partner
 *    who had stopped paying.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Plus, Eye, UserPlus, Power, RotateCcw } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useCreateSponsor, useSponsors, useUpdateSponsor } from '../hooks/useAdmin';

/** Dollars typed by a human → cents. Empty is zero, not NaN. */
function toCents(v: string): number {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function SponsorManagement() {
  const { show } = useToast();
  const { data: sponsors, isLoading, isError, refetch } = useSponsors();
  const create = useCreateSponsor();
  const update = useUpdateSponsor();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [utmCode, setUtmCode] = useState('');
  const [tier, setTier] = useState('');
  const [contracted, setContracted] = useState('');

  const canCreate = name.trim().length > 1 && /^[a-z0-9-]{2,64}$/i.test(utmCode.trim());

  const submit = () =>
    create.mutate(
      {
        name: name.trim(),
        utmCode: utmCode.trim().toLowerCase(),
        ...(tier.trim() ? { tier: tier.trim() } : {}),
        ...(contracted.trim() ? { contractedCents: toCents(contracted) } : {}),
      },
      {
        onSuccess: () => {
          show(`${name.trim()} added`, 'success');
          setName('');
          setUtmCode('');
          setTier('');
          setContracted('');
          setAdding(false);
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not add that sponsor', 'danger'),
      },
    );

  const toggle = (s: { id: string; name: string; active: boolean }) =>
    update.mutate(
      { id: s.id, active: !s.active },
      {
        onSuccess: (res) =>
          show(
            s.active
              ? `${s.name} ended — logo removed, UTM stopped. Finished with ${res.impressions.toLocaleString()} impressions and ${res.attributedSignups} signups.`
              : `${s.name} is live again`,
            s.active ? 'warning' : 'success',
          ),
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not update that sponsor', 'danger'),
      },
    );

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="120px" $radius={16} />
      </Wrap>
    );
  }
  /* A failure gets its own state now, rather than looking like a page that never finished loading. */
  if (isError || !sponsors) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load sponsors" onRetry={() => void refetch()} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      {adding ? (
        <AddCard>
          <AddTitle>Add a sponsor</AddTitle>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
          <Input
            label="UTM code"
            hint="Goes in their link as ?utm= — this is what attributes signups to them."
            value={utmCode}
            onChange={(e) => setUtmCode(e.target.value)}
            error={utmCode.trim() && !/^[a-z0-9-]{2,64}$/i.test(utmCode.trim()) ? 'Letters, numbers and hyphens only' : undefined}
          />
          <Input label="Tier (optional)" placeholder="launch" value={tier} onChange={(e) => setTier(e.target.value)} />
          <Input
            label="Contracted amount (optional)"
            hint="What they agreed to pay. Recorded here for your reference — nothing is charged."
            inputMode="decimal"
            placeholder="0.00"
            value={contracted}
            onChange={(e) => setContracted(e.target.value)}
          />
          <AddActions>
            <Button disabled={!canCreate} loading={create.isPending} onClick={submit}>
              Add sponsor
            </Button>
            <Button variant="tertiary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </AddActions>
        </AddCard>
      ) : (
        <TopBar>
          <Button size="compact" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add a sponsor
          </Button>
        </TopBar>
      )}

      {sponsors.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No sponsors yet"
          description="Add one to put their logo on the landing page and attribute signups to their link."
        />
      ) : (
        sponsors.map((s) => (
          <Card key={s.id} $inactive={!s.active}>
            <Head>
              <div>
                <Name>{s.name}</Name>
                <Utm>?utm={s.utmCode}</Utm>
              </div>
              <StatusChip
                status={s.active ? 'free' : 'away'}
                label={s.active ? 'Live' : 'Ended'}
                size="sm"
              />
            </Head>

            <Stats>
              <Stat>
                <Eye size={14} aria-hidden />
                <b className="tnum">{s.impressions.toLocaleString()}</b>
                <span>logo views</span>
              </Stat>
              <Stat>
                <UserPlus size={14} aria-hidden />
                <b className="tnum">{s.attributedSignups.toLocaleString()}</b>
                <span>signups from their link</span>
              </Stat>
              <Stat>
                <b className="tnum">{formatCents(s.contractedCents)}</b>
                {/* Named honestly. It is a note, not a payment. */}
                <span>contracted · recorded by hand</span>
              </Stat>
            </Stats>

            <Actions>
              <Button size="compact" variant="tertiary" loading={update.isPending} onClick={() => toggle(s)}>
                {s.active ? (
                  <>
                    <Power size={15} /> End sponsorship
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} /> Reactivate
                  </>
                )}
              </Button>
            </Actions>
          </Card>
        ))
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 720px;
`;
const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const Card = styled.div<{ $inactive: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  opacity: ${({ $inactive }) => ($inactive ? 0.72 : 1)};
`;
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Utm = styled.p`
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Stat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  b {
    font-size: 16px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  svg {
    align-self: center;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const AddCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const AddTitle = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const AddActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
