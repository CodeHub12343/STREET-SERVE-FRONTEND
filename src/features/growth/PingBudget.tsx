'use client';

/**
 * V-09 Ping sharing budget (docs/12 §4, FR-5) — fund/reload/pause the paid-sharing budget, set the
 * per-share tip, and see attribution (shares → conversions). Funding is 💳.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Share2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Switch } from '@/components/primitives/Switch';
import { Stepper } from '@/components/primitives/Stepper';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Modal } from '@/components/primitives/Modal';
import { PaymentSheet } from '@/features/payments';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { useVendorBusiness } from '@/features/vendor/hooks/useVendorBusinessId';
import {
  usePingBudget,
  useFundPingBudget,
  useSetBudgetStatus,
  useRefreshBudget,
} from './usePingBudget';

/** Preset top-up amounts (cents) — funding is a real card charge, so the amount must be chosen. */
const RELOAD_OPTIONS = [1000, 2000, 5000];

export function PingBudget() {
  const { show } = useToast();
  const { businessId: rawBusinessId } = useVendorBusiness();
  const businessId = rawBusinessId ?? undefined;
  const { data, isLoading } = usePingBudget(businessId);
  const fund = useFundPingBudget(businessId);
  const setStatus = useSetBudgetStatus(businessId);
  const refresh = useRefreshBudget(businessId);

  const [tipCents, setTipCents] = useState(50);
  const [reloadCents, setReloadCents] = useState(RELOAD_OPTIONS[0]!);
  const [funding, setFunding] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  // Mirror server state once it arrives, so the controls show what's actually configured.
  useEffect(() => {
    if (data?.perShareTipCents !== undefined) setTipCents(data.perShareTipCents);
  }, [data?.perShareTipCents]);

  if (isLoading || !data) return <Wrap><Skeleton $h="140px" $radius={16} /></Wrap>;
  const remaining = data.balanceCents;
  const paused = data.status === 'paused';

  const startFunding = () => {
    fund.mutate(
      { reloadCents, perShareTipCents: tipCents },
      {
        onSuccess: (res) => {
          setSecret(res.clientSecret);
          setFunding(true);
        },
        onError: () => show('Could not start the top-up', 'danger'),
      },
    );
  };

  return (
    <Wrap>
      <Card>
        <Head><Share2 size={20} aria-hidden /> Ping sharing</Head>
        <Balance>
          <b className="tnum">{formatCents(remaining)}</b>
          <span>remaining of {formatCents(data.fundedCents)} funded</span>
        </Balance>
        <Bar>
          <Fill
            style={{
              width: data.fundedCents > 0 ? `${Math.round((remaining / data.fundedCents) * 100)}%` : '0%',
            }}
          />
        </Bar>
        <Amounts role="radiogroup" aria-label="Top-up amount">
          {RELOAD_OPTIONS.map((cents) => (
            <AmountBtn
              key={cents}
              type="button"
              role="radio"
              aria-checked={reloadCents === cents}
              $active={reloadCents === cents}
              onClick={() => setReloadCents(cents)}
            >
              {formatCents(cents)}
            </AmountBtn>
          ))}
        </Amounts>
        <Button size="compact" loading={fund.isPending} onClick={startFunding}>
          Add {formatCents(reloadCents)}
        </Button>
        <Small>Charged to your card. Tips are paid from this balance.</Small>
      </Card>

      <Card>
        <RowBetween>
          <div><Label>Per-share tip</Label><Small>Paid to sharers on a qualifying action</Small></div>
          <Stepper value={tipCents} min={0} max={200} step={25} onChange={setTipCents} ariaLabel="Tip per share (cents)" />
        </RowBetween>
        <RowBetween>
          <div><Label>Pause sharing</Label><Small>Stops paying tips; free shares still work</Small></div>
          <Switch
            label="Pause sharing"
            checked={paused}
            onChange={(next) => setStatus.mutate(next ? 'paused' : 'active')}
          />
        </RowBetween>
      </Card>

      <Stats>
        <Stat><b className="tnum">{data.shares}</b><span>Shares</span></Stat>
        <Stat><b className="tnum">{data.conversions}</b><span>Conversions</span></Stat>
        <Stat>
          <Rate>
            <TrendingUp size={14} />{' '}
            {data.shares > 0 ? Math.round((data.conversions / data.shares) * 100) : 0}%
          </Rate>
          <span>Convert rate</span>
        </Stat>
      </Stats>

      <Modal open={funding} onClose={() => setFunding(false)} title="Reload ping budget">
        <PaymentSheet
          clientSecret={secret ?? 'demo'}
          amountCents={reloadCents}
          onSuccess={() => {
            setFunding(false);
            // The balance rises when the webhook credits it, not on confirm — say so honestly.
            show('Payment sent — your balance updates once it clears', 'success');
            refresh();
          }}
        />
      </Modal>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 560px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Head = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
`;
const Balance = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  b {
    font-size: 30px;
  }
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Bar = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const Fill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.accentSecondary};
`;
const Amounts = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const AmountBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.textPrimary : theme.color.surfaceRaised2)};
  color: ${({ theme, $active }) => ($active ? theme.color.surfaceBase : theme.color.textSecondary)};
  border: 1px solid ${({ theme, $active }) => ($active ? 'transparent' : theme.color.line2)};
`;
const RowBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Label = styled.p`
  font-weight: 600;
  font-size: 14px;
`;
const Small = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Stat = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  b {
    font-size: 22px;
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Rate = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.statusLive};
`;
