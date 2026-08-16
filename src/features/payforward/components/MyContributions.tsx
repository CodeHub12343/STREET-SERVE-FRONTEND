'use client';

/**
 * A giver's own gifts.
 *
 * **This screen exists because a contribution is the only payment in the platform that returns
 * nothing.** No order, no goods, no receipt, no delivery — and the public wall shows only settled
 * gifts, anonymously, so a giver could not even pick out their own. There was no way to answer the
 * one question they actually have: *did that go through?*
 *
 * So the status is the point, and the tone follows the same rules as the rest of the feature:
 *
 *  • **No celebration and no gratitude theatre.** A row, a status, a number. Someone who gave $20
 *    to a stranger does not need the app to perform emotion back at them.
 *  • **A failed gift is the loudest row, not a hidden one.** It is the only state the giver has to
 *    do something about, and the copy says plainly that nothing was charged.
 *  • **Never who was helped.** `remainingCents` says how much is still waiting; the difference says
 *    the rest of it reached someone. Which someone is not the giver's business and never will be.
 */
import styled, { css } from 'styled-components';
import { HeartHandshake } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { useMyContributions, useRefundContribution } from '../hooks/usePayForward';
import type { MyContribution } from '../types';

/**
 * What a gift is currently doing, in the giver's language.
 *
 * `pending` deliberately does NOT say "processing" — the honest thing is that the money has not
 * arrived yet, because until the webhook settles it, it genuinely has not.
 */
function statusLine(c: MyContribution): { label: string; tone: Tone; detail: string } {
  if (c.status === 'failed') {
    return {
      label: 'Didn’t go through',
      tone: 'danger',
      detail: 'Your card wasn’t charged. You can give again whenever you like.',
    };
  }
  if (c.status === 'pending') {
    return {
      label: 'Waiting on your bank',
      tone: 'muted',
      detail: 'This usually takes a moment. It reaches the fund once the payment clears.',
    };
  }
  if (c.expiredAt) {
    return {
      label: 'Passed on',
      tone: 'muted',
      // ADR-005 §6 — and it never went back to the business, which is the part worth saying.
      detail: 'Unused after the expiry window, so it went to other community funds in this city.',
    };
  }
  if (c.remainingCents <= 0) {
    return {
      label: 'All used',
      tone: 'good',
      detail: 'Every cent of this went towards someone’s order.',
    };
  }
  if (c.remainingCents < c.amountCents) {
    return {
      label: 'Partly used',
      tone: 'good',
      detail: `${formatCents(c.amountCents - c.remainingCents)} has gone to someone. ${formatCents(c.remainingCents)} is still waiting.`,
    };
  }
  return {
    label: 'Waiting for someone',
    tone: 'good',
    detail: 'In the fund, ready for the next person who needs it.',
  };
}

type Tone = 'good' | 'muted' | 'danger';

export function MyContributions() {
  const { data, isLoading, isError, refetch } = useMyContributions();
  const { show } = useToast();
  const refund = useRefundContribution();

  return (
    <TabPage title="Your gifts" backHref="/profile" backLabel="Back to profile">
      {isLoading ? (
        <Skeleton $h="200px" $radius={16} />
      ) : isError || !data ? (
        <ErrorState title="Couldn’t load your gifts" onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="You haven’t paid it forward yet"
          description="When you give to a business’s community fund, your gifts show up here — including what’s still waiting for someone."
        />
      ) : (
        <List>
          {data.map((c) => {
            const s = statusLine(c);
            return (
              <Card key={c.id} $tone={s.tone}>
                <Top>
                  <Where>
                    <HeartHandshake size={15} aria-hidden />
                    {c.businessName ?? 'A local business'}
                  </Where>
                  <Amount className="tnum">{formatCents(c.amountCents)}</Amount>
                </Top>
                <StatusRow>
                  <Badge $tone={s.tone}>{s.label}</Badge>
                  <When>{new Date(c.createdAt).toLocaleDateString()}</When>
                </StatusRow>
                <Detail>{s.detail}</Detail>
                {c.refundedCents > 0 ? (
                  <Detail>You took back {formatCents(c.refundedCents)} of this.</Detail>
                ) : null}
                {c.note ? <Note>“{c.note}”</Note> : null}

                {/*
                  ADR-005 §7. Offered only while the server says something is refundable — the
                  screen never works out the window or the unspent amount itself. Deliberately
                  understated: this is an undo, not an exit ramp being advertised.
                */}
                {c.refundableCents > 0 ? (
                  <TakeBack
                    type="button"
                    disabled={refund.isPending}
                    onClick={() =>
                      refund.mutate(c.id, {
                        onSuccess: (r) =>
                          show(
                            r.keptCents > 0
                              ? `${formatCents(r.refundedCents)} is on its way back. ${formatCents(r.keptCents)} had already reached someone.`
                              : `${formatCents(r.refundedCents)} is on its way back to your card.`,
                            'success',
                          ),
                        onError: (e) =>
                          show(
                            e instanceof AppApiError
                              ? e.message
                              : 'Couldn’t take that back. Please try again.',
                            'danger',
                          ),
                      })
                    }
                  >
                    Take back {formatCents(c.refundableCents)}
                  </TakeBack>
                ) : null}
              </Card>
            );
          })}
        </List>
      )}
    </TabPage>
  );
}

const toneColor = (tone: Tone) => css`
  color: ${({ theme }) =>
    tone === 'danger'
      ? theme.color.statusDanger
      : tone === 'good'
        ? theme.color.statusLive
        : theme.color.textTertiary};
`;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 640px;
`;
const Card = styled.article<{ $tone: Tone }>`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  /* A failed gift is the one row that needs finding at a glance. */
  border: 1px solid
    ${({ theme, $tone }) => ($tone === 'danger' ? theme.color.statusDanger : theme.color.line2)};
`;
const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Where = styled.h3`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  svg {
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const Amount = styled.b`
  font-size: 16px;
  font-weight: 800;
`;
const StatusRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Badge = styled.span<{ $tone: Tone }>`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  ${({ $tone }) => toneColor($tone)}
`;
const When = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Detail = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
/* Quiet by design. An undo, not an exit ramp being advertised. */
const TakeBack = styled.button`
  justify-self: start;
  margin-top: 2px;
  padding: 0;
  font-size: 13px;
  font-family: inherit;
  color: ${({ theme }) => theme.color.textSecondary};
  background: none;
  border: none;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  &:hover:not(:disabled) { color: ${({ theme }) => theme.color.textPrimary}; }
  &:disabled { opacity: .5; cursor: default; }
`;
const Note = styled.p`
  font-size: 13px;
  font-style: italic;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
