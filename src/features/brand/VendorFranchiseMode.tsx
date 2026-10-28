'use client';

/**
 * ═══ 2026-10-28 — Vendor "Franchise Mode" guided page. ═══
 *
 * One screen the business owner opens to turn their single-truck profile into a multi-truck
 * brand AND set it up with a partner, without navigating away. The page progresses through
 * three visible steps:
 *
 *   1. Enable Franchise Mode (one click converts the business into a brand).
 *   2. Invite an operator (email + truck name; sends an invite immediately).
 *   3. Choose how money flows (pooled or per-operator split).
 *
 * Each step unlocks when the previous one is done. The whole flow is self-serve — no admin,
 * no delays, no page jumps. A link to the richer brand overview sits at the bottom for owners
 * who want more detail.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import Link from 'next/link';
import {
  CheckCircle2,
  HeartHandshake,
  Rocket,
  Send,
  Store,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { useVendorBusiness } from '@/features/vendor';
import { useBusiness } from '@/features/business';

interface MembershipRow {
  membershipId: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  role: 'owner' | 'manager' | 'operator';
  isOwner: boolean;
}

interface ConvertResponse {
  brandId: string;
  slug: string;
  businessId: string;
}

interface BrandInvite {
  id: string;
  inviteeEmail: string;
  role: 'manager' | 'operator';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string | null;
}

interface Overview {
  brand: { id: string; name: string; slug: string };
  businesses: { id: string; name: string; status: string }[];
  operators: { operatorId: string; displayName: string; businessId: string }[];
  pendingInvites: { id: string; inviteeEmail: string; role: string; expiresAt: string }[];
  policy: { mode: 'pooled' | 'per_operator'; splits: { operatorId: string; shareBps: number }[] };
}

export function VendorFranchiseMode() {
  const qc = useQueryClient();
  const { show } = useToast();
  const { businessId } = useVendorBusiness();
  const { data: biz } = useBusiness(businessId ?? undefined);

  const memberships = useQuery<MembershipRow[]>({
    queryKey: ['me', 'brand-memberships'],
    queryFn: () => api.get<MembershipRow[]>(endpoints.myBrandMemberships),
    staleTime: 30_000,
  });

  const ownedBrand = memberships.data?.find((m) => m.isOwner);
  const brandId = ownedBrand?.brandId ?? null;

  const overview = useQuery<Overview>({
    queryKey: ['brand', brandId, 'overview'],
    queryFn: () => api.get<Overview>(endpoints.brandOverview(brandId!)),
    enabled: Boolean(brandId),
    staleTime: 15_000,
  });

  const invites = useQuery<BrandInvite[]>({
    queryKey: ['brand', brandId, 'invites'],
    queryFn: () => api.get<BrandInvite[]>(endpoints.brandInvites(brandId!)),
    enabled: Boolean(brandId),
    staleTime: 10_000,
  });

  const [brandName, setBrandName] = useState('');

  // Step 2 — invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [truckName, setTruckName] = useState('');
  const [seatBusinessId, setSeatBusinessId] = useState('');

  // Step 3 — policy choice
  const [policyMode, setPolicyMode] = useState<'pooled' | 'per_operator'>('pooled');
  const [sharePercent, setSharePercent] = useState(50); // Owner's share %; the rest split evenly across operators

  useEffect(() => {
    if (overview.data?.policy.mode) setPolicyMode(overview.data.policy.mode);
  }, [overview.data?.policy.mode]);

  const businesses = overview.data?.businesses ?? [];
  const effectiveSeatBiz =
    seatBusinessId && businesses.some((b) => b.id === seatBusinessId)
      ? seatBusinessId
      : businesses[0]?.id ?? '';

  const enable = useMutation<ConvertResponse>({
    mutationFn: () =>
      api.post<ConvertResponse>(endpoints.myBusinessConvertToBrand(businessId ?? ''), {
        brandName: brandName.trim() || biz?.name,
      }),
    onSuccess: () => {
      show('Franchise Mode is on. Now invite your first partner.', 'success');
      void qc.invalidateQueries({ queryKey: ['me', 'brand-memberships'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not enable franchise mode.', 'danger'),
  });

  const sendInvite = useMutation({
    mutationFn: () =>
      api.post(endpoints.brandInvites(brandId!), {
        inviteeEmail: inviteEmail.trim(),
        role: 'operator',
        seatOperator: {
          businessId: effectiveSeatBiz,
          displayName: truckName.trim(),
        },
      }),
    onSuccess: () => {
      show('Invite sent. They’ll get an email with a link to join.', 'success');
      setInviteEmail('');
      setTruckName('');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'invites'] });
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'overview'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not send invite.', 'danger'),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => api.post(endpoints.brandInviteRevoke(inviteId), {}),
    onSuccess: () => {
      show('Invite revoked.', 'success');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'invites'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not revoke invite.', 'danger'),
  });

  const savePolicy = useMutation({
    mutationFn: () => {
      const operators = overview.data?.operators ?? [];
      if (policyMode === 'pooled') {
        return api.put(endpoints.myBrandPayoutPolicy(brandId!), {
          mode: 'pooled',
          splits: [],
        });
      }
      /** Owner share + even split of the remainder across operators. */
      const ownerShare = Math.max(0, Math.min(100, sharePercent));
      const opShare = operators.length > 0 ? (100 - ownerShare) / operators.length : 0;
      const splits = operators.map((op) => ({
        operatorId: op.operatorId,
        shareBps: Math.round(opShare * 100),
      }));
      // Last leg absorbs rounding so splits sum to 10000.
      const sum = splits.reduce((s, l) => s + l.shareBps, 0);
      const lastLeg = splits[splits.length - 1];
      if (lastLeg) {
        lastLeg.shareBps += 10000 - Math.round(ownerShare * 100) - sum;
      }
      return api.put(endpoints.myBrandPayoutPolicy(brandId!), {
        mode: 'per_operator',
        splits,
      });
    },
    onSuccess: () => {
      show('Payout policy saved.', 'success');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'overview'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not save policy.', 'danger'),
  });

  const pendingInvites = useMemo(
    () => (invites.data ?? []).filter((i) => i.status === 'pending'),
    [invites.data],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────────────

  if (memberships.isLoading) {
    return (
      <Page>
        <Skeleton $h="320px" $radius={16} />
      </Page>
    );
  }

  if (!businessId || !biz) {
    return (
      <Page>
        <Header>
          <Rocket size={22} aria-hidden />
          <h1>Franchise Mode</h1>
        </Header>
        <Lede>
          Franchise Mode turns an existing business into a brand with multiple trucks. You
          don&apos;t have a business on this account yet — register one first, then come back
          here. We&apos;ll walk you through adding partners and splitting payouts in two clicks.
        </Lede>
        <ActionGrid>
          <ActionCard href="/vendor/register">
            <Store size={16} aria-hidden /> Register a business
          </ActionCard>
        </ActionGrid>
      </Page>
    );
  }

  const canSave = policyMode === 'pooled' || (overview.data?.operators?.length ?? 0) > 0;

  return (
    <Page>
      <Header>
        <Rocket size={22} aria-hidden />
        <h1>Franchise Mode</h1>
      </Header>
      <Lede>
        Run more than one truck under the same name. Add partners by email, split payouts
        automatically, and keep one brand on the map. Three quick steps below.
      </Lede>

      {/* ─── Step 1 — Enable ─────────────────────────────────────────────── */}
      <StepCard $done={Boolean(ownedBrand)}>
        <StepHead>
          <StepNumber $done={Boolean(ownedBrand)}>
            {ownedBrand ? <CheckCircle2 size={16} /> : '1'}
          </StepNumber>
          <StepTitle>Enable Franchise Mode</StepTitle>
        </StepHead>
        {!ownedBrand ? (
          <>
            <StepBody>
              Instantly turn <strong>{biz.name}</strong> into a brand. Your orders, reviews,
              followers, and Stripe account carry over.
            </StepBody>
            <Input
              label="Brand name (optional)"
              hint={`We’ll use "${biz.name}" if you leave this blank.`}
              placeholder={biz.name}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
            <Button fullWidth loading={enable.isPending} onClick={() => enable.mutate()}>
              Enable Franchise Mode
            </Button>
          </>
        ) : (
          <StepDone>
            <strong>{ownedBrand.brandName}</strong> is live.
          </StepDone>
        )}
      </StepCard>

      {/* ─── Step 2 — Invite a partner ───────────────────────────────────── */}
      <StepCard $done={Boolean(ownedBrand) && pendingInvites.length === 0 && (overview.data?.operators?.length ?? 0) > 0} $disabled={!ownedBrand}>
        <StepHead>
          <StepNumber $done={Boolean(ownedBrand) && (overview.data?.operators?.length ?? 0) > 0}>
            {ownedBrand && (overview.data?.operators?.length ?? 0) > 0 ? (
              <CheckCircle2 size={16} />
            ) : (
              '2'
            )}
          </StepNumber>
          <StepTitle>Invite a partner to drive a truck</StepTitle>
        </StepHead>

        {!ownedBrand ? (
          <StepHint>Enable Franchise Mode above to unlock this step.</StepHint>
        ) : (
          <>
            <StepBody>
              Enter your partner&apos;s email. They&apos;ll get a link, sign in, and land on
              their own dashboard — scoped to just their truck. No admin step, no waiting.
            </StepBody>
            <Fields>
              <Input
                label="Partner's email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Input
                label="Truck name (shown on the map)"
                placeholder="North truck"
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
              />
              {businesses.length > 1 ? (
                <SelectRow>
                  <SelectLabel>Which business are they driving for?</SelectLabel>
                  <Select
                    value={effectiveSeatBiz}
                    onChange={(e) => setSeatBusinessId(e.target.value)}
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </SelectRow>
              ) : null}
            </Fields>
            <Button
              fullWidth
              disabled={
                !/.+@.+\..+/.test(inviteEmail.trim()) ||
                truckName.trim().length < 1 ||
                !effectiveSeatBiz
              }
              loading={sendInvite.isPending}
              onClick={() => sendInvite.mutate()}
            >
              <Send size={14} aria-hidden /> Send invite
            </Button>

            {pendingInvites.length > 0 ? (
              <PendingList>
                <PendingHead>
                  <Users size={13} aria-hidden /> Pending invites
                </PendingHead>
                {pendingInvites.map((inv) => (
                  <PendingRow key={inv.id}>
                    <span>{inv.inviteeEmail}</span>
                    <RevokeBtn
                      type="button"
                      onClick={() => revoke.mutate(inv.id)}
                      disabled={revoke.isPending}
                    >
                      <Trash2 size={12} aria-hidden /> Revoke
                    </RevokeBtn>
                  </PendingRow>
                ))}
              </PendingList>
            ) : null}

            {(overview.data?.operators?.length ?? 0) > 0 ? (
              <ActiveList>
                <PendingHead>
                  <HeartHandshake size={13} aria-hidden /> Active trucks
                </PendingHead>
                {overview.data!.operators.map((op) => (
                  <ActiveRow key={op.operatorId}>{op.displayName}</ActiveRow>
                ))}
              </ActiveList>
            ) : null}
          </>
        )}
      </StepCard>

      {/* ─── Step 3 — Payout policy ──────────────────────────────────────── */}
      <StepCard $disabled={!ownedBrand}>
        <StepHead>
          <StepNumber $done={false}>3</StepNumber>
          <StepTitle>Choose how money flows</StepTitle>
        </StepHead>

        {!ownedBrand ? (
          <StepHint>Enable Franchise Mode above to unlock this step.</StepHint>
        ) : (
          <>
            <PolicyRow role="radiogroup" aria-label="Payout policy">
              <PolicyChip
                type="button"
                role="radio"
                aria-checked={policyMode === 'pooled'}
                $selected={policyMode === 'pooled'}
                onClick={() => setPolicyMode('pooled')}
              >
                <strong>Pooled</strong>
                <small>Every sale lands in your Stripe account. Simple.</small>
              </PolicyChip>
              <PolicyChip
                type="button"
                role="radio"
                aria-checked={policyMode === 'per_operator'}
                $selected={policyMode === 'per_operator'}
                onClick={() => setPolicyMode('per_operator')}
              >
                <strong>Split per operator</strong>
                <small>Each sale splits between you and the drivers.</small>
              </PolicyChip>
            </PolicyRow>

            {policyMode === 'per_operator' ? (
              <SplitBox>
                <SplitLabel>Your share</SplitLabel>
                <SplitRange>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sharePercent}
                    onChange={(e) => setSharePercent(Number(e.target.value))}
                  />
                  <SplitValue className="tnum">{sharePercent}%</SplitValue>
                </SplitRange>
                <SplitHint>
                  Operators split the remaining <strong>{100 - sharePercent}%</strong> evenly.
                  You can fine-tune each operator&apos;s share later from the brand overview.
                </SplitHint>
              </SplitBox>
            ) : null}

            <Button
              fullWidth
              disabled={!canSave}
              loading={savePolicy.isPending}
              onClick={() => savePolicy.mutate()}
            >
              Save payout policy
            </Button>
          </>
        )}
      </StepCard>

      {ownedBrand ? (
        <ActionGrid>
          <ActionCard href={`/brand/${ownedBrand.brandId}/overview`}>
            <Store size={16} aria-hidden /> Open full brand overview
          </ActionCard>
          <ActionCard href={`/brand/${ownedBrand.brandId}/members`}>
            <Users size={16} aria-hidden /> Member settings
          </ActionCard>
        </ActionGrid>
      ) : null}
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 760px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  h1 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const Lede = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const StepCard = styled.section<{ $done?: boolean; $disabled?: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $done }) => ($done ? theme.color.statusLive : theme.color.line)};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const StepHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const StepNumber = styled.span<{ $done: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme, $done }) =>
    $done ? theme.color.statusLive : theme.color.accentPrimary};
  color: #fff;
  font-weight: 800;
  font-size: 13px;
`;

const StepTitle = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 17px;
  font-weight: 800;
`;

const StepBody = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const StepDone = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const StepHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Fields = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const SelectRow = styled.div`
  display: grid;
  gap: 4px;
`;

const SelectLabel = styled.span`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Select = styled.select`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  font-size: 14px;
`;

const PendingList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const PendingHead = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const PendingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 13.5px;
`;

const RevokeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`;

const ActiveList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const ActiveRow = styled.div`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 10%, ${theme.color.surfaceRaised})`};
  font-size: 13.5px;
  font-weight: 700;
`;

const PolicyRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 1fr 1fr;
  }
`;

const PolicyChip = styled.button<{ $selected: boolean }>`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  text-align: left;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.surfaceRaised2 : theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $selected }) => ($selected ? theme.color.accentPrimary : theme.color.line)};
  strong {
    font-size: 14px;
  }
  small {
    font-size: 12.5px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const SplitBox = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;

const SplitLabel = styled.span`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const SplitRange = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  input[type='range'] {
    flex: 1;
  }
`;

const SplitValue = styled.span`
  font-weight: 800;
  font-size: 15px;
`;

const SplitHint = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const ActionGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 1fr 1fr;
  }
`;

const ActionCard = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 700;
  font-size: 14px;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
