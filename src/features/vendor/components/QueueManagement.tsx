'use client';

/**
 * V-04 Queue Management (docs/13 V-04) — three jobs, each now actionable:
 *  1. See the live line: who's in it, their position, and the discount each locked at join.
 *  2. Set the line-up discount: the tiers that reward people for joining (this was empty + unusable).
 *  3. Trigger a Pop-Up delay when you have to move — everyone keeps their spot and gets a heads-up.
 * Positions/discounts are server-computed; the vendor sets the schedule and triggers Pop-Up only.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Zap, Users, Plus, X, Check, TrendingUp } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useVendorQueue,
  useSetDiscountSchedule,
  useTriggerPopUp,
  useServeNext,
  type DiscountTier,
} from '../hooks/useVendorQueue';

export function QueueManagement({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: queue, isLoading } = useVendorQueue(businessId);
  const save = useSetDiscountSchedule(businessId);
  const popUp = useTriggerPopUp(businessId);
  const serveNext = useServeNext(businessId);

  // Local, editable copy of the discount tiers; seeded from the server and re-seeded when it loads.
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [cap, setCap] = useState('0');
  useEffect(() => {
    if (queue) {
      setTiers(queue.tiers);
      setCap(String(queue.capPercent));
    }
  }, [queue]);

  if (isLoading || !queue) {
    return (
      <Wrap>
        <Skeleton $h="120px" $radius={16} />
        <Skeleton $h="160px" $radius={16} />
      </Wrap>
    );
  }

  // Nudge state reflects the SAVED schedule (server), not the in-progress local edits — so a vendor
  // who hasn't saved yet still sees the "optional, add any time" framing (R1/U1/U2).
  const hasActiveDiscount = queue.tiers.length > 0;

  const setTierPercent = (i: number, v: string) => {
    const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    setTiers((t) => t.map((tier, idx) => (idx === i ? { ...tier, percent: n } : tier)));
  };
  const addTier = () => setTiers((t) => [...t, { position: t.length + 1, percent: 0 }]);
  const removeTier = (i: number) =>
    setTiers((t) => t.filter((_, idx) => idx !== i).map((tier, idx) => ({ ...tier, position: idx + 1 })));

  const saveSchedule = () => {
    if (tiers.length === 0) return show('Add at least one tier, or leave the line-up discount off', 'warning');
    // Server rule: each tier must be a strictly bigger discount than the one above it.
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i]!.percent <= tiers[i - 1]!.percent) {
        return show('Each tier must be a bigger discount than the one above it.', 'warning');
      }
    }
    // Server rule: the cap can't be below the biggest tier — raise it to fit rather than error out.
    const maxTier = Math.max(...tiers.map((t) => t.percent));
    const capValue = Math.max(maxTier, Math.min(100, Math.round(Number(cap) || 0)));
    setCap(String(capValue));
    save.mutate(
      { tiers, capPercent: capValue },
      {
        onSuccess: () => show('Line-up discount saved', 'success'),
        onError: () => show('Couldn’t save the discount. Please try again.', 'danger'),
      },
    );
  };

  const triggerPopUp = () => {
    if (!queue.activeSessionId) return;
    popUp.mutate(queue.activeSessionId, {
      onSuccess: () => show('Pop-Up sent — everyone in line was told about the short delay', 'warning'),
      onError: () => show('Couldn’t send the Pop-Up. Please try again.', 'danger'),
    });
  };

  return (
    <Wrap>
      {/* ── The live line ─────────────────────────────────────────────── */}
      <Header>
        <Users size={20} aria-hidden />
        <b className="tnum">{queue.count}</b> in line
      </Header>
      {queue.entries.length === 0 ? (
        <Muted>No one’s in line yet — accepted wave-downs and walk-ups show up here.</Muted>
      ) : (
        <Line>
          {queue.entries.map((e, i) => (
            <Entry key={e.position}>
              <Pos className="tnum">#{e.position}</Pos>
              <Name>{e.customerName}</Name>
              {e.discountPercent > 0 ? <Locked>{e.discountPercent}% locked</Locked> : null}
              {/* Serve only the front of the line — that's who's up next. */}
              {i === 0 ? (
                <Button
                  size="compact"
                  loading={serveNext.isPending}
                  onClick={() =>
                    serveNext.mutate(undefined, {
                      onSuccess: (r) => show(`Served ${r.servedCustomerName ?? e.customerName} — next up!`, 'success'),
                      onError: () => show('Couldn’t serve — please try again.', 'danger'),
                    })
                  }
                >
                  <Check size={15} /> Serve
                </Button>
              ) : null}
            </Entry>
          ))}
        </Line>
      )}

      {/* ── Line-up discount editor ───────────────────────────────────── */}
      <SectionRow>
        <Section>Line-up discount</Section>
        <OptionalTag>Optional</OptionalTag>
      </SectionRow>
      {/* The nudge frames discounts as a growth lever, never a gate: you're already live and selling
          without one. When set, it's positive reinforcement (the "Trending nudge" of R1). */}
      <Nudge $active={hasActiveDiscount}>
        <TrendingUp size={16} aria-hidden />
        <span>
          {hasActiveDiscount ? (
            <>
              <b>Boosting your visibility.</b> Your line-up discount rewards early customers and lifts
              you in Trending. Adjust the tiers any time.
            </>
          ) : (
            <>
              <b>Add a discount to get discovered faster.</b> It’s optional — you’re live and selling
              without one. Rewarding early customers boosts your Trending visibility, and you can add
              it any time.
            </>
          )}
        </span>
      </Nudge>
      <Hint>Reward people for joining the line: earlier spots get a bigger discount, locked in when they join.</Hint>
      <Tiers>
        {tiers.map((t, i) => (
          <TierRow key={i}>
            <TierPos>#{t.position}</TierPos>
            <PercentField>
              <Input
                aria-label={`Discount for position ${t.position}`}
                inputMode="numeric"
                value={String(t.percent)}
                onChange={(ev) => setTierPercent(i, ev.target.value)}
              />
              <Pct>%</Pct>
            </PercentField>
            <RemoveBtn type="button" aria-label={`Remove tier ${t.position}`} onClick={() => removeTier(i)}>
              <X size={14} />
            </RemoveBtn>
          </TierRow>
        ))}
        <AddBtn type="button" onClick={addTier}>
          <Plus size={14} /> Add tier
        </AddBtn>
      </Tiers>
      <CapRow>
        <span>Maximum discount (cap)</span>
        <PercentField>
          <Input aria-label="Discount cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
          <Pct>%</Pct>
        </PercentField>
      </CapRow>
      <Button size="compact" loading={save.isPending} onClick={saveSchedule}>
        <Check size={16} /> Save discount
      </Button>

      {/* ── Pop-Up delay ──────────────────────────────────────────────── */}
      <Section>Pop-Up delay</Section>
      <Button
        variant="secondary"
        loading={popUp.isPending}
        disabled={!queue.activeSessionId}
        onClick={triggerPopUp}
      >
        <Zap size={16} /> Trigger Pop-Up delay
      </Button>
      <PopHint>
        {queue.activeSessionId
          ? 'Use Pop-Up when you have to move or pause — the line keeps their spots and discounts, and everyone gets a heads-up.'
          : 'Go live first — Pop-Up tells the people in your line about a short delay while you’re active.'}
      </PopHint>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  width: 100%;
  max-width: 560px;
  min-width: 0;
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-size: 24px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Line = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Entry = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* narrow phones: the Serve button drops to its own line instead of overflowing */
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Pos = styled.span`
  font-weight: 800;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  min-width: 28px;
`;
const Name = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
  font-size: 15px;
`;
const Locked = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusDiscount};
`;
const Section = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SectionRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const OptionalTag = styled.span`
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Nudge = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme, $active }) =>
    `color-mix(in srgb, ${$active ? theme.color.statusDiscount : theme.color.accentSecondary} 10%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme, $active }) =>
      `color-mix(in srgb, ${$active ? theme.color.statusDiscount : theme.color.accentSecondary} 30%, transparent)`};
  svg {
    flex: none;
    margin-top: 1px;
    color: ${({ theme, $active }) =>
      $active ? theme.color.statusDiscount : theme.color.accentSecondary};
  }
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    font-weight: 750;
  }
`;
const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: -8px;
`;
const Tiers = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const TierRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const TierPos = styled.span`
  font-weight: 800;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  min-width: 28px;
`;
const PercentField = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  & > *:first-child {
    flex: 1;
    min-width: 0;
  }
`;
const Pct = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const RemoveBtn = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textTertiary};
  &:hover {
    color: ${({ theme }) => theme.color.statusDanger};
    border-color: ${({ theme }) => theme.color.statusDanger};
  }
`;
const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  cursor: pointer;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const CapRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  span {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  & > *:last-child {
    max-width: 120px;
  }
`;
const PopHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: -8px;
`;
