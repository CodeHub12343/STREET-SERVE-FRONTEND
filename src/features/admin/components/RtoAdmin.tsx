'use client';

/**
 * The RTO compliance surface (roadmap 2.11 / M-10).
 *
 * Three switches decide whether rent-to-own may happen at all — approved sellers, opened cities,
 * eligible categories — and until now all three were changed by direct API or database access.
 * They live on one screen because they are one decision: an admin reviewing whether to open a
 * market needs to see what is already open.
 *
 * The legal-review gate is shown at the top rather than left implicit. An admin looking at an empty
 * RTO marketplace should be told the reason is the agreement, not left to hunt for a config bug.
 */
import styled from 'styled-components';
import { AlertTriangle, Lock, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Switch } from '@/components/primitives/Switch';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import {
  useApproveRtoSeller,
  useRtoApprovals,
  useRtoMarkets,
  useRevokeRtoSeller,
  useSetCategoryRto,
  useSetCityRto,
} from '../hooks/useRtoAdmin';
import { BusinessPicker } from './BusinessPicker';
import type { AdminBusiness } from '../types';

export function RtoAdmin() {
  const { show } = useToast();
  const markets = useRtoMarkets();
  const approvals = useRtoApprovals();
  const setCity = useSetCityRto();
  const setCategory = useSetCategoryRto();
  const revoke = useRevokeRtoSeller();
  const approve = useApproveRtoSeller();
  const [picked, setPicked] = useState<AdminBusiness | null>(null);
  const [newNote, setNewNote] = useState('');

  const onError = (e: unknown) =>
    show(e instanceof AppApiError ? e.message : 'Could not update', 'danger');

  if (markets.isLoading) {
    return (
      <TabPage title="Rent-to-Own controls" backHref="/admin" backLabel="Back to admin">
        <Skeleton $h="240px" $radius={16} />
      </TabPage>
    );
  }
  if (markets.isError || !markets.data) {
    return (
      <TabPage title="Rent-to-Own controls" backHref="/admin" backLabel="Back to admin">
        <ErrorState onRetry={() => void markets.refetch()} />
      </TabPage>
    );
  }

  return (
    <TabPage title="Rent-to-Own controls" backHref="/admin" backLabel="Back to admin">
      {/* §60 — the launch gate, stated rather than implied. */}
      {markets.data.agreementReviewed ? (
        <Gate $ok>
          <ShieldCheck size={18} aria-hidden />
          <span>
            The rent-to-own agreement ({markets.data.agreementVersion}) has cleared legal review.
            Customers can accept agreements.
          </span>
        </Gate>
      ) : (
        <Gate>
          <AlertTriangle size={18} aria-hidden />
          <span>
            <b>Rent-to-own is closed.</b> The agreement is still placeholder text pending attorney
            review, so no customer can accept one — whatever else is switched on below.
          </span>
        </Gate>
      )}

      <Section>
        <H2>Markets</H2>
        <Hint>A city must be live and explicitly opened. Anything unlisted is closed.</Hint>
        <Rows>
          {markets.data.cities.map((c) => (
            <Row key={c.slug}>
              <div>
                <Label>
                  {c.name}, {c.state}
                </Label>
                <Sub>{c.status === 'live' ? 'Live' : 'Pre-launch'}</Sub>
              </div>
              <Switch
                label={`Rent-to-own in ${c.name}`}
                checked={c.rtoEnabled}
                disabled={c.status !== 'live' || setCity.isPending}
                onChange={(enabled) =>
                  setCity.mutate({ slug: c.slug, enabled }, { onError })
                }
              />
            </Row>
          ))}
        </Rows>
      </Section>

      <Section>
        <H2>Categories</H2>
        <Hint>
          Default-deny: a category is closed until opened here. Vehicles and regulated goods can
          never be opened — they need a separately reviewed programme.
        </Hint>
        <Rows>
          {markets.data.categories.map((c) => (
            <Row key={c.id}>
              <div>
                <Label>{c.name}</Label>
                {c.prohibited ? (
                  <Locked>
                    <Lock size={11} aria-hidden /> Cannot be opened
                  </Locked>
                ) : null}
              </div>
              <Switch
                label={`Rent-to-own for ${c.name}`}
                checked={c.rtoEligible}
                disabled={c.prohibited || setCategory.isPending}
                onChange={(eligible) =>
                  setCategory.mutate({ id: c.id, eligible }, { onError })
                }
              />
            </Row>
          ))}
        </Rows>
      </Section>

      <Section>
        <H2>Approved sellers</H2>
        <Hint>
          Approving lets a business publish Rent-to-Own offers. Revoking stops it taking NEW
          customers; agreements already in flight are deliberately untouched.
        </Hint>

        {/*
          The grant half of this control. Only revoke was ever wired, so approving a seller meant
          calling the API by hand — the manual gate is intentional, but doing it outside the product
          is not.
        */}
        <ApproveForm
          onSubmit={(e) => {
            e.preventDefault();
            approve.mutate(
              { sellerId: picked!.id, note: newNote.trim() },
              {
                onSuccess: () => {
                  show('Seller approved for Rent-to-Own', 'success');
                  setPicked(null);
                  setNewNote('');
                },
                onError,
              },
            );
          }}
        >
          {/*
            Chosen by name, never typed as an id. The previous field asked for a 24-character
            ObjectId, which the operator has no way to obtain and no way to check — a USER id was
            accepted, recorded, and reported as success while the seller stayed blocked.
          */}
          <BusinessPicker value={picked} onChange={setPicked} label="Business" />
          <Input
            label="Why (recorded against the approval)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="e.g. reviewed trading history, ID verified"
          />
          {/*
            The note is required here though the API allows it to be null: "who approved this and
            why" is the entire audit value of a manual gate, and an approval nobody can explain a
            year later is not much of a control.
          */}
          <Button
            type="submit"
            size="compact"
            disabled={!picked || newNote.trim().length < 3}
            loading={approve.isPending}
          >
            <ShieldCheck size={14} aria-hidden /> Approve seller
          </Button>
        </ApproveForm>
        {approvals.isLoading ? (
          <Skeleton $h="80px" $radius={12} />
        ) : (approvals.data ?? []).length === 0 ? (
          <Sub>No sellers approved yet.</Sub>
        ) : (
          <Rows>
            {(approvals.data ?? []).map((a) => (
              <Row key={a.sellerId}>
                <div>
                  {/*
                    The name, because a hex id cannot be checked by a person — which is how a USER
                    id sat in this list looking exactly as legitimate as a business id.

                    A missing name is shown as unresolved rather than hidden: that row is a
                    permission granted against something that no longer exists (or never did), and
                    it has to stay visible to be revocable.
                  */}
                  <Label>{a.businessName ?? 'Unknown business'}</Label>
                  <Sub>
                    {a.businessName ? (a.note ?? 'Approved') : `No business with id ${a.sellerId}`}
                  </Sub>
                </div>
                <Button
                  size="compact"
                  variant="tertiary"
                  loading={revoke.isPending}
                  onClick={() => revoke.mutate(a.sellerId, { onError })}
                >
                  <X size={14} aria-hidden /> Revoke
                </Button>
              </Row>
            ))}
          </Rows>
        )}
      </Section>
    </TabPage>
  );
}

const Gate = styled.div<{ $ok?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $ok }) => ($ok ? theme.color.statusLive : theme.color.statusWarning)};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[5]}px;
  svg {
    flex: none;
    color: ${({ theme, $ok }) => ($ok ? theme.color.statusLive : theme.color.statusWarning)};
    margin-top: 1px;
  }
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[5]}px;
`;
const H2 = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const Hint = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ApproveForm = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  justify-items: start;
  min-width: 0;
`;
const Rows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
`;
const Label = styled.p`
  font-size: 14px;
  font-weight: 700;
`;
const Sub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Locked = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusDanger};
`;
