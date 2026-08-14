'use client';

/**
 * EventPin (E-4) — an event on the map.
 *
 * A third distinct shape, following the same rule as `HubPin`: businesses are round ringed avatars,
 * hubs are squared badges, events are a pointed marker. Three layers on one map only stay legible if
 * they're distinguishable by silhouette rather than by colour (a11y §2.8).
 *
 * Attendance leads when known, because that is the number that makes an event worth walking to.
 * When it ISN'T known the pin says the name and nothing more — showing "0 people" for an unknown
 * turnout would be a fabricated number in the one place a seller is most likely to act on it.
 */
import styled from 'styled-components';
import { CalendarDays } from 'lucide-react';

export interface EventPinProps {
  name: string;
  /** Null means genuinely unknown — never rendered as zero. */
  expectedAttendance: number | null;
  /** Hours until it starts; negative or zero means it's under way. */
  hoursUntil: number;
  onClick?: () => void;
}

/** Above hubs, below live businesses: an event is time-bound, a vendor is present right now. */
export const EVENT_PIN_PRIORITY = 8;

function attendanceLabel(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function EventPin({ name, expectedAttendance, hoursUntil, onClick }: EventPinProps) {
  const live = hoursUntil <= 0;
  const label =
    expectedAttendance !== null
      ? `${name}, ${expectedAttendance} people expected, ${live ? 'on now' : `in ${Math.round(hoursUntil)} hours`}`
      : `${name}, ${live ? 'on now' : `in ${Math.round(hoursUntil)} hours`}`;

  return (
    <Wrap type="button" onClick={onClick} aria-label={label}>
      <Badge $live={live}>
        <CalendarDays size={13} aria-hidden />
        {expectedAttendance !== null ? (
          <Count className="tnum">{attendanceLabel(expectedAttendance)}</Count>
        ) : null}
      </Badge>
      <Tail $live={live} aria-hidden />
      <Caption>{live ? 'On now' : `in ${Math.round(hoursUntil)}h`}</Caption>
    </Wrap>
  );
}

const Wrap = styled.button`
  display: grid;
  justify-items: center;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentPrimary};
    outline-offset: 3px;
    border-radius: 10px;
  }
`;
/** Pointed rather than round or square — the third silhouette. */
const Badge = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 12px 12px 12px 3px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme, $live }) =>
    $live ? theme.color.statusLive : theme.color.accentPrimary};
  box-shadow:
    0 0 0 2px ${({ theme }) => theme.color.surfaceBase},
    ${({ theme }) => theme.color.shadow};
`;
const Count = styled.span`
  font-size: 12px;
  line-height: 1;
`;
const Tail = styled.span<{ $live: boolean }>`
  width: 2px;
  height: 7px;
  background: ${({ theme, $live }) =>
    $live ? theme.color.statusLive : theme.color.accentPrimary};
`;
const Caption = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 5px;
  white-space: nowrap;
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textSecondary};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
