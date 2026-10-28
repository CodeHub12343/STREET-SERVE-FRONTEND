'use client';

/**
 * ═══ FRANCHISE / MULTI-VENDOR — Phase 3 brand member + invite management. ═══
 *
 * Owner / manager only (server-enforced). Shows pending invites with revoke actions, plus a
 * compose form to send a new invite. Invite emails are sent server-side; the acceptance link
 * is built from the Stripe-Connect return URL's origin so it points at the real frontend.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Trash2, Send, Mail } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { useRequireAuth } from '@/lib/auth/guards';

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

interface OverviewBusiness {
  id: string;
  name: string;
  status: string;
}

interface OverviewLite {
  businesses: OverviewBusiness[];
}

export function BrandMembers({ brandId }: { brandId: string }) {
  useRequireAuth();
  const qc = useQueryClient();
  const { show } = useToast();

  /** The overview carries the brand's businesses — we need them to seat a new operator. */
  const overview = useQuery<OverviewLite>({
    queryKey: ['brand', brandId, 'overview', 'lite'],
    queryFn: () => api.get<OverviewLite>(endpoints.brandOverview(brandId)),
    staleTime: 30_000,
  });

  const invites = useQuery<BrandInvite[]>({
    queryKey: ['brand', brandId, 'invites'],
    queryFn: () => api.get<BrandInvite[]>(endpoints.brandInvites(brandId)),
    staleTime: 15_000,
  });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'operator'>('operator');
  const [seatBusinessId, setSeatBusinessId] = useState('');
  const [seatDisplayName, setSeatDisplayName] = useState('');

  const businesses = overview.data?.businesses ?? [];
  // Keep the seat business id valid once businesses load.
  const effectiveSeatBiz =
    seatBusinessId && businesses.some((b) => b.id === seatBusinessId)
      ? seatBusinessId
      : businesses[0]?.id ?? '';

  const create = useMutation({
    mutationFn: () =>
      api.post(endpoints.brandInvites(brandId), {
        inviteeEmail: email.trim(),
        role,
        ...(role === 'operator' && effectiveSeatBiz && seatDisplayName.trim()
          ? {
              seatOperator: {
                businessId: effectiveSeatBiz,
                displayName: seatDisplayName.trim(),
              },
            }
          : {}),
      }),
    onSuccess: () => {
      show('Invite sent', 'success');
      setEmail('');
      setSeatDisplayName('');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'invites'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not send invite', 'danger'),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => api.post(endpoints.brandInviteRevoke(inviteId), {}),
    onSuccess: () => {
      show('Invite revoked', 'success');
      void qc.invalidateQueries({ queryKey: ['brand', brandId, 'invites'] });
    },
    onError: (err) =>
      show(err instanceof AppApiError ? err.message : 'Could not revoke invite', 'danger'),
  });

  const canCreate =
    /.+@.+\..+/.test(email.trim()) &&
    (role === 'manager' ||
      (effectiveSeatBiz && seatDisplayName.trim().length >= 1));

  if (invites.isLoading || overview.isLoading) {
    return (
      <Page>
        <Skeleton $h="420px" $radius={16} />
      </Page>
    );
  }
  if (invites.isError) {
    return (
      <Page>
        <ErrorState title="Couldn't load invites" onRetry={() => void invites.refetch()} />
      </Page>
    );
  }

  const pending = (invites.data ?? []).filter((i) => i.status === 'pending');
  const history = (invites.data ?? []).filter((i) => i.status !== 'pending');

  return (
    <Page>
      <Header>
        <h1>Members &amp; invites</h1>
        <p>Invite a manager or seat a new operator at one of your trucks.</p>
      </Header>

      <Form>
        <h2>Send an invite</h2>
        <Input
          label="Invitee email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <RoleRow role="radiogroup" aria-label="Role">
          {(['manager', 'operator'] as const).map((r) => (
            <RoleChip
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              $selected={role === r}
              onClick={() => setRole(r)}
            >
              {r}
            </RoleChip>
          ))}
        </RoleRow>
        {role === 'operator' ? (
          <SeatRow>
            <Select
              aria-label="Seat at business"
              value={effectiveSeatBiz}
              onChange={(e) => setSeatBusinessId(e.target.value)}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Input
              label="Truck name (shown on the map)"
              placeholder="e.g. North truck"
              value={seatDisplayName}
              onChange={(e) => setSeatDisplayName(e.target.value)}
            />
          </SeatRow>
        ) : null}
        <Button disabled={!canCreate} loading={create.isPending} onClick={() => create.mutate()}>
          <Send size={14} aria-hidden /> Send invite
        </Button>
      </Form>

      <Section>
        <h2>Pending</h2>
        {pending.length === 0 ? (
          <Empty>No pending invites.</Empty>
        ) : (
          <InviteList>
            {pending.map((inv) => (
              <Row key={inv.id}>
                <RowMain>
                  <Mail size={14} aria-hidden />
                  <strong>{inv.inviteeEmail}</strong>
                  <RoleBadge>{inv.role}</RoleBadge>
                  <Expires>Expires {new Date(inv.expiresAt).toDateString()}</Expires>
                </RowMain>
                <RevokeButton
                  type="button"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(inv.id)}
                >
                  <Trash2 size={14} aria-hidden /> Revoke
                </RevokeButton>
              </Row>
            ))}
          </InviteList>
        )}
      </Section>

      {history.length > 0 ? (
        <Section>
          <h2>History</h2>
          <InviteList>
            {history.map((inv) => (
              <Row key={inv.id}>
                <RowMain>
                  <Mail size={14} aria-hidden />
                  <span>{inv.inviteeEmail}</span>
                  <RoleBadge>{inv.role}</RoleBadge>
                  <HistoryStatus $status={inv.status}>{inv.status}</HistoryStatus>
                </RowMain>
              </Row>
            ))}
          </InviteList>
        </Section>
      ) : null}
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  max-width: 760px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Header = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  h1 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 16px;
    font-weight: 800;
  }
`;

const RoleRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const RoleChip = styled.button<{ $selected: boolean }>`
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  text-transform: capitalize;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.accentPrimary : theme.color.surfaceRaised2};
  color: ${({ theme, $selected }) => ($selected ? '#fff' : theme.color.textPrimary)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? 'transparent' : theme.color.line)};
`;

const SeatRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 1fr 2fr;
  }
`;

const Select = styled.select`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  font-size: 14px;
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 16px;
    font-weight: 800;
  }
`;

const InviteList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  font-size: 13.5px;
`;

const RowMain = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;

const RoleBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Expires = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const HistoryStatus = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $status }) =>
    $status === 'accepted' ? theme.color.statusLive : theme.color.textSecondary};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const RevokeButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
