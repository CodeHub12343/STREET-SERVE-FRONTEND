'use client';

/**
 * One gig, as it appears in both the nearby feed and "My gigs". Tapping anywhere opens the detail
 * screen — the card itself carries no lifecycle actions, because every transition (check-in,
 * check-out) needs context and confirmation the card has no room for.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import {
  applicationPresentation,
  estimatedTotalCents,
  formatDistance,
  formatPay,
  formatSchedule,
} from '../presentation';
import { formatCents } from '@/lib/money';
import type { Job } from '../types';

export function JobCard({ job }: { job: Job }) {
  const schedule = formatSchedule(job);
  const distance = formatDistance(job.distanceM);
  const estimate = estimatedTotalCents(job);
  const state = job.application ? applicationPresentation(job.application.status) : null;

  return (
    <Card href={`/seller/jobs/${job.id}`}>
      <Head>
        <div>
          {/* A-5: the kind of work, above the title — a worker scanning the board is deciding
              "can I do this?" before "who's it for?". */}
          {job.jobTypeLabel ? <TypeTag>{job.jobTypeLabel}</TypeTag> : null}
          <Title>{job.title}</Title>
          <Employer>{job.employerName}</Employer>
        </div>
        <PayBlock>
          <Pay className="tnum">{formatPay(job)}</Pay>
          {estimate ? <Estimate className="tnum">≈ {formatCents(estimate)} total</Estimate> : null}
        </PayBlock>
      </Head>

      {distance || schedule ? (
        <Meta>
          {distance ? (
            <span>
              <MapPin size={13} aria-hidden /> {distance}
            </span>
          ) : null}
          {schedule ? (
            <span>
              <Clock size={13} aria-hidden /> {schedule}
            </span>
          ) : null}
        </Meta>
      ) : null}

      {state ? (
        <StateRow>
          <Badge tone={state.tone}>{state.label}</Badge>
          <Hint>{state.hint}</Hint>
        </StateRow>
      ) : null}
    </Card>
  );
}

const Card = styled(Link)`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: inherit;
  text-decoration: none;
`;
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const TypeTag = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-bottom: 2px;
`;
const Title = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Employer = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PayBlock = styled.div`
  display: grid;
  justify-items: end;
  gap: 2px;
`;
const Pay = styled.span`
  font-weight: 800;
  font-size: 18px;
  color: ${({ theme }) => theme.color.statusLive};
  white-space: nowrap;
`;
const Estimate = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
  white-space: nowrap;
`;
const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;
const StateRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;
const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
