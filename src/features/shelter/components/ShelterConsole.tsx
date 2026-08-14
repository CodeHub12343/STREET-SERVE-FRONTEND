'use client';

/**
 * B-1/B-3 — the shelter staff console.
 *
 * Two jobs, both done standing at a front desk with someone waiting:
 *   1. Enrol a resident and read them a code. The code is shown ONCE, large, because it's about to
 *      be written on paper or read aloud — and it is genuinely unrecoverable afterwards.
 *   2. Hand over money and record it. Every held sum belongs to a named resident and the shelter is
 *      accountable for it, so the ledger leads with what's owed rather than with history.
 *
 * Reporting stays aggregate (FR-12.3): this screen never shows one resident's earnings.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Copy, HandCoins, UserPlus } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import {
  useCustodyLedger,
  useDisburseCustody,
  useEnrollResident,
  useShelterReport,
} from '../hooks/useShelter';
import type { EnrollResult } from '../types';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function ShelterConsole({ partnerId }: { partnerId: string }) {
  const report = useShelterReport(partnerId);
  const ledger = useCustodyLedger(partnerId, 'held');
  const disburse = useDisburseCustody(partnerId);
  const { show } = useToast();

  return (
    <Wrap>
      {report.data ? (
        <Stats>
          <Stat>
            <StatLabel>Residents</StatLabel>
            <StatValue className="tnum">{report.data.residentCount}</StatValue>
            <StatHint>{report.data.trainedCount} trained</StatHint>
          </Stat>
          <Stat>
            <StatLabel>Invites open</StatLabel>
            <StatValue className="tnum">{report.data.invitedCount}</StatValue>
            <StatHint>not claimed yet</StatHint>
          </Stat>
          <Stat $accent>
            <StatLabel>Holding for residents</StatLabel>
            <StatValue className="tnum">{formatCents(report.data.custodyHeldCents)}</StatValue>
            <StatHint>to hand over</StatHint>
          </Stat>
        </Stats>
      ) : null}

      <EnrollCard partnerId={partnerId} />

      <SectionTitle>
        <HandCoins size={14} aria-hidden /> Money to hand over
      </SectionTitle>
      {ledger.isLoading ? (
        <Skeleton $h="120px" $radius={16} />
      ) : !ledger.data || ledger.data.entries.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Nothing outstanding"
          description="When a resident earns, their share arrives here for you to hand over."
        />
      ) : (
        <List>
          {ledger.data.entries.map((e) => (
            <Row key={e.id}>
              <RowMain>
                <RowAmount className="tnum">{formatCents(e.amountCents)}</RowAmount>
                <RowMeta>
                  {/* Deliberately an opaque id, not a name: staff match it in their own records,
                      and this screen has no business rendering a roster of who earned what. */}
                  Resident {e.residentUserId.slice(-6)} · {day(e.createdAt)}
                </RowMeta>
              </RowMain>
              <Button
                size="compact"
                loading={disburse.isPending && disburse.variables?.custodyId === e.id}
                onClick={() =>
                  disburse.mutate(
                    { custodyId: e.id, method: 'cash' },
                    { onSuccess: () => show('Marked as handed over', 'success') },
                  )
                }
              >
                Hand over cash
              </Button>
            </Row>
          ))}
        </List>
      )}
    </Wrap>
  );
}

/**
 * The enrollment form. `residentUserId` is deliberately absent — staff enrol the person in front of
 * them and hand over a code, rather than walking them through account creation first.
 */
function EnrollCard({ partnerId }: { partnerId: string }) {
  const enroll = useEnrollResident(partnerId);
  const [amount, setAmount] = useState('50');
  const [name, setName] = useState('');
  const [issued, setIssued] = useState<EnrollResult | null>(null);
  const { show } = useToast();

  if (issued?.claimCode) {
    return (
      <CodeCard>
        <CodeLabel>Give this code to the resident</CodeLabel>
        <CodeValue>{issued.claimCode}</CodeValue>
        <CodeNote>
          It works once, and you can’t look it up again — write it down or read it out now. They can
          use it on any phone.
        </CodeNote>
        <CodeActions>
          <Button
            size="compact"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(issued.claimCode!);
              show('Code copied', 'success');
            }}
          >
            <Copy size={14} aria-hidden /> Copy
          </Button>
          <Button size="compact" onClick={() => setIssued(null)}>
            Enrol someone else
          </Button>
        </CodeActions>
      </CodeCard>
    );
  }

  return (
    <Card>
      <SectionTitle as="h3">
        <UserPlus size={14} aria-hidden /> Enrol a resident
      </SectionTitle>
      <Field>
        <FieldLabel htmlFor="verifier">Your name</FieldLabel>
        <Input
          id="verifier"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dana R."
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="alloc">Cosigned amount ($)</FieldLabel>
        <Input
          id="alloc"
          value={amount}
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
        />
        {/* Say plainly what signing this means — it is a real liability, capped here and nowhere else. */}
        <FieldHint>
          The most your organisation is standing behind at any one time. They can’t take more stock
          than this until they return some.
        </FieldHint>
      </Field>

      {enroll.isError ? (
        <Banner tone="warning" title="Couldn’t enrol">
          {enroll.error.message}
        </Banner>
      ) : null}

      <Button
        disabled={!name.trim() || !amount}
        loading={enroll.isPending}
        onClick={() =>
          enroll.mutate(
            {
              cosignedAllocationCents: Number(amount) * 100,
              staffVerifierName: name.trim(),
            },
            { onSuccess: setIssued },
          )
        }
      >
        Create code
      </Button>
    </Card>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 640px;
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Stat = styled.div<{ $accent?: boolean }>`
  display: grid;
  gap: 3px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $accent }) =>
    $accent
      ? `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})`
      : theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)` : theme.color.line2};
`;
const StatLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const StatValue = styled.b`
  font-size: 20px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const StatHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  justify-items: start;
`;
const Field = styled.div`
  display: grid;
  gap: 4px;
  width: 100%;
`;
const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const FieldHint = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 14px;
`;
/** The code screen is intentionally loud — it exists to be read across a desk. */
const CodeCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`};
  justify-items: center;
  text-align: center;
`;
const CodeLabel = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CodeValue = styled.b`
  font-size: 40px;
  letter-spacing: 0.18em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const CodeNote = styled.p`
  font-size: 12px;
  line-height: 1.5;
  max-width: 340px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const CodeActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const RowMain = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;
const RowAmount = styled.b`
  font-size: 15px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const RowMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
