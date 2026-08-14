'use client';

/**
 * D-3/D-4 — the Academy catalog and what you've earned.
 *
 * Two things share this screen deliberately. A catalog of courses alone reads as homework; putting
 * the badges and certifications you already hold at the top reframes it as a record of what you've
 * built. The certification card in particular is the one a hub owner will look at, so it's shown to
 * the seller the same way it'll be shown to them.
 */
import styled, { css } from 'styled-components';
import Link from 'next/link';
import { Award, Check, Clock, Lock, RefreshCw } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useCourses, useCredentials } from '../hooks/useAcademy';
import type { CourseSummary } from '../types';

export function AcademyHome() {
  const { data: courses, isLoading, isError, refetch } = useCourses();
  const { data: creds } = useCredentials();

  if (isLoading) {
    return (
      <TabPage title="Academy">
        <Stack>
          <Skeleton $h="120px" $radius={16} />
          <Skeleton $h="120px" $radius={16} />
        </Stack>
      </TabPage>
    );
  }
  if (isError || !courses) {
    return (
      <TabPage title="Academy">
        <ErrorState
          title="Couldn’t load the Academy"
          message="Please try again in a moment."
          onRetry={() => void refetch()}
        />
      </TabPage>
    );
  }

  const certs = creds?.certifications ?? [];
  const badgeCount = creds?.badges.length ?? 0;

  return (
    <TabPage title="Academy">
      <Lede>
        Free, short, and yours to keep. Everything here is written to be finished in one sitting.
      </Lede>

      {/* D-4: what you hold, before what you could take. */}
      {certs.length > 0 || badgeCount > 0 ? (
        <Earned>
          <SectionTitle>What you’ve earned</SectionTitle>
          <CertRow>
            {certs.map((c) => (
              <Cert key={c.key} $stale={!c.current}>
                <Award size={15} aria-hidden />
                <CertBody>
                  <b>{c.label}</b>
                  <span>
                    {c.current
                      ? 'Recognised by hubs'
                      : 'Course updated — retake to keep this valid'}
                  </span>
                </CertBody>
              </Cert>
            ))}
            {badgeCount > 0 ? (
              <BadgeCount>
                {badgeCount} course{badgeCount === 1 ? '' : 's'} completed
              </BadgeCount>
            ) : null}
          </CertRow>
        </Earned>
      ) : null}

      <SectionTitle>Courses</SectionTitle>
      <Stack>
        {courses.map((c) => (
          <CourseCard key={c.slug} course={c} />
        ))}
      </Stack>
    </TabPage>
  );
}

function CourseCard({ course: c }: { course: CourseSummary }) {
  const state = c.locked
    ? 'locked'
    : c.needsRetake
      ? 'retake'
      : c.passed
        ? 'passed'
        : 'available';

  const body = (
    <>
      <CardHead>
        <div>
          {c.certification ? <CertTag>Certification</CertTag> : null}
          {c.requiredFor ? <ReqTag>Required · {c.requiredFor}</ReqTag> : null}
          <CardTitle>{c.title}</CardTitle>
        </div>
        <State $state={state}>
          {state === 'passed' ? (
            <>
              <Check size={13} aria-hidden /> Done
            </>
          ) : state === 'retake' ? (
            <>
              <RefreshCw size={13} aria-hidden /> Retake
            </>
          ) : state === 'locked' ? (
            <>
              <Lock size={13} aria-hidden /> Locked
            </>
          ) : (
            <>
              <Clock size={13} aria-hidden /> {c.estimatedMinutes} min
            </>
          )}
        </State>
      </CardHead>
      <CardSummary>{c.summary}</CardSummary>
      {c.locked ? (
        <Hint>Finish {c.missingPrerequisites.join(', ')} first.</Hint>
      ) : c.needsRetake ? (
        // Someone who did the work deserves to be told the content changed, not silently reset.
        <Hint>The content changed since you passed — a quick retake keeps it current.</Hint>
      ) : (
        <Hint>
          {c.moduleCount} parts · {c.questionCount} questions · pass at {c.passMark}%
        </Hint>
      )}
    </>
  );

  // A locked course is not a link — nothing behind it would work yet.
  return c.locked ? <CardStatic>{body}</CardStatic> : <Card href={`/seller/academy/${c.slug}`}>{body}</Card>;
}

const Lede = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0 0 ${({ theme }) => theme.space[2]}px;
`;
const Earned = styled.section`
  margin-bottom: ${({ theme }) => theme.space[5]}px;
`;
const CertRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Cert = styled.div<{ $stale: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $stale }) =>
    $stale
      ? theme.color.surfaceRaised
      : `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme, $stale }) =>
      $stale
        ? theme.color.line2
        : `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`};
  color: ${({ theme, $stale }) => ($stale ? theme.color.textTertiary : theme.color.statusLive)};
`;
const CertBody = styled.span`
  display: grid;
  gap: 1px;

  b {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  span {
    font-size: 11px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const BadgeCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const cardStyles = css`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-decoration: none;
`;
const Card = styled(Link)`
  ${cardStyles}
`;
const CardStatic = styled.div`
  ${cardStyles}
  opacity: 0.7;
`;
const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const CertTag = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.statusLive};
`;
const ReqTag = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CardTitle = styled.b`
  display: block;
  font-size: 15px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const State = styled.span<{ $state: 'passed' | 'retake' | 'locked' | 'available' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $state }) =>
    $state === 'passed'
      ? theme.color.statusLive
      : $state === 'retake'
        ? theme.color.statusAway
        : theme.color.textTertiary};
`;
const CardSummary = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const Hint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
