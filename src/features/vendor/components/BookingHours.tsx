'use client';

/**
 * Weekly booking-hours editor — lives on the vendor Services page. The backend generates the
 * customer's bookable slots exclusively from these windows; before this editor existed there was
 * no UI writing them, so every business showed "No open times" on every date.
 *
 * One window per weekday (the backend accepts several; one keeps the editor simple). Times are
 * stored as minutes-from-midnight UTC — the backend's pilot-phase simplification.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useAvailabilityWindows,
  useSetAvailabilityWindows,
  type AvailabilityWindow,
} from '../hooks/useVendorAvailability';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Render order Monday-first; values stay the backend's 0=Sunday. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface DayRow {
  open: boolean;
  start: string; // "HH:MM"
  end: string;
}

const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const CLOSED: DayRow = { open: false, start: '09:00', end: '17:00' };

export function BookingHours({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: windows, isLoading } = useAvailabilityWindows(businessId);
  const save = useSetAvailabilityWindows(businessId);

  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [error, setError] = useState<string>();

  // Seed the editor from the server once; after that it's local state until Save.
  useEffect(() => {
    if (rows || !windows) return;
    const byDay = new Map<number, AvailabilityWindow>();
    for (const w of windows) if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, w);
    setRows(
      DAYS.map((_, day) => {
        const w = byDay.get(day);
        return w ? { open: true, start: toHHMM(w.startMin), end: toHHMM(w.endMin) } : { ...CLOSED };
      }),
    );
  }, [windows, rows]);

  const patch = (day: number, p: Partial<DayRow>) => {
    setError(undefined);
    setRows((prev) => prev?.map((r, i) => (i === day ? { ...r, ...p } : r)) ?? prev);
  };

  const submit = () => {
    if (!rows) return;
    const out: AvailabilityWindow[] = [];
    for (let day = 0; day < rows.length; day += 1) {
      const r = rows[day];
      if (!r?.open) continue;
      const startMin = toMin(r.start);
      const endMin = toMin(r.end);
      if (startMin >= endMin) {
        setError(`${DAYS[day]}: opening time must be before closing time.`);
        return;
      }
      out.push({ dayOfWeek: day, startMin, endMin });
    }
    save.mutate(out, {
      onSuccess: () => show('Booking hours saved', 'success'),
      onError: () => show('Could not save booking hours', 'danger'),
    });
  };

  if (isLoading || !rows) {
    return <Skeleton $h="220px" $radius={16} />;
  }

  const anyOpen = rows.some((r) => r.open);

  return (
    <Card>
      <Head>
        <CalendarClock size={18} aria-hidden />
        <div>
          <h2>Booking hours</h2>
          <Sub>
            When customers can book your services. No hours set means nobody can pick a time.
          </Sub>
        </div>
      </Head>

      <Table>
        {DAY_ORDER.map((day) => {
          const r = rows[day] ?? CLOSED;
          return (
            <Row key={day}>
              <DayToggle>
                <input
                  type="checkbox"
                  checked={r.open}
                  onChange={(e) => patch(day, { open: e.target.checked })}
                  aria-label={`Open on ${DAYS[day]}`}
                />
                <span>{DAYS[day]}</span>
              </DayToggle>
              {r.open ? (
                <Times>
                  <input
                    type="time"
                    value={r.start}
                    aria-label={`${DAYS[day]} opening time`}
                    onChange={(e) => patch(day, { start: e.target.value })}
                  />
                  <Dash>–</Dash>
                  <input
                    type="time"
                    value={r.end}
                    aria-label={`${DAYS[day]} closing time`}
                    onChange={(e) => patch(day, { end: e.target.value })}
                  />
                </Times>
              ) : (
                <Closed>Closed</Closed>
              )}
            </Row>
          );
        })}
      </Table>

      {error ? <ErrorText role="alert">{error}</ErrorText> : null}
      {!anyOpen ? (
        <Hint>Every day is closed — customers won’t be able to book you at all.</Hint>
      ) : null}

      <Button fullWidth loading={save.isPending} onClick={submit}>
        Save booking hours
      </Button>
    </Card>
  );
}

const Card = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Head = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  align-items: flex-start;
  color: ${({ theme }) => theme.color.accentSecondary};
  h2 {
    font-size: 16px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Table = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Let the time fields drop to their own line when the day + both inputs can't share one. */
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  min-height: 36px;
`;
const DayToggle = styled.label`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  input {
    accent-color: ${({ theme }) => theme.color.accentPrimary};
    width: 16px;
    height: 16px;
  }
`;
const Times = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  /* Grow to fill the row, shrink to fit, and wrap to a full line under the day when space is tight. */
  flex: 1 1 200px;
  min-width: 0;
  gap: ${({ theme }) => theme.space[2]}px;
  input {
    /* min-width: 0 defeats the time control's intrinsic min-width so it can shrink on small screens;
       max-width keeps it tidy on wide ones. This is the field that was blowing out the page. */
    flex: 1 1 0;
    min-width: 0;
    max-width: 132px;
    padding: 6px 8px;
    border-radius: ${({ theme }) => theme.radius.control}px;
    border: 1px solid ${({ theme }) => theme.color.line2};
    background: ${({ theme }) => theme.color.surfaceBase};
    color: ${({ theme }) => theme.color.textPrimary};
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
`;
const Dash = styled.span`
  flex: none;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Closed = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ErrorText = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.statusDanger};
`;
const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
