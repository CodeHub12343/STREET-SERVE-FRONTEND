'use client';

/**
 * D-2 — "tell us what you're good at".
 *
 * This is the cold-start fix. Product matching ran on past-category affinity alone, which is the one
 * signal a brand-new seller cannot have — so the person the platform most needs to activate got no
 * personalisation at all. Two taps here changes that on their first session.
 *
 * Kept to chips and one select on purpose. A long form is a form nobody finishes, and a
 * half-finished profile is worse than a blank one: it looks like data while being unrepresentative.
 *
 * The inferred panel is shown, not hidden. Someone should always be able to see what we concluded
 * about them from their behaviour, separately from what they told us — and how much of it we're
 * relying on.
 */
import styled from 'styled-components';
import { Bike, Car, Footprints, Sparkles, Train, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useProfileOptions,
  useSellerProfile,
  useUpdateSellerProfile,
} from '../hooks/useAcademy';
import type { SellerTransport } from '../types';

/** Human labels for the closed server vocabulary. */
const LABEL: Record<string, string> = {
  talking_to_people: 'Talking to people',
  crafts_and_handmade: 'Crafts & handmade',
  food_and_drink: 'Food & drink',
  tech_and_gadgets: 'Tech & gadgets',
  fashion_and_style: 'Fashion & style',
  kids_and_family: 'Kids & family',
  automotive: 'Automotive',
  sports_and_outdoors: 'Sports & outdoors',
  street_and_sidewalk: 'Street & sidewalk',
  parks: 'Parks',
  farmers_markets: 'Farmers markets',
  sports_events: 'Sports events',
  car_events: 'Car events',
  concerts_and_festivals: 'Concerts & festivals',
  transit_hubs: 'Transit hubs',
  campus: 'Campus',
  on_foot: 'On foot',
  bike: 'Bike',
  transit: 'Transit',
  car: 'Car',
  van: 'Van',
};

const TRANSPORT_ICON: Record<SellerTransport, ReactNode> = {
  on_foot: <Footprints size={15} aria-hidden />,
  bike: <Bike size={15} aria-hidden />,
  transit: <Train size={15} aria-hidden />,
  car: <Car size={15} aria-hidden />,
  van: <Truck size={15} aria-hidden />,
};

export function SellerProfileEditor() {
  const { data: profile, isLoading, isError, refetch } = useSellerProfile();
  const { data: options } = useProfileOptions();
  const update = useUpdateSellerProfile();
  const { show } = useToast();

  if (isLoading) {
    return (
      <TabPage title="Your selling profile">
        <Skeleton $h="280px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !profile) {
    return (
      <TabPage title="Your selling profile">
        <ErrorState
          title="Couldn’t load your profile"
          message="Please try again in a moment."
          onRetry={() => void refetch()}
        />
      </TabPage>
    );
  }

  /** Optimistic-feeling save: one field at a time, so nothing is lost to a mis-tap. */
  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, { onSuccess: () => show('Saved', 'success') });

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <TabPage title="Your selling profile">
      <Lede>
        This is what we use to pick what to show you. Nothing here is public — hubs see your Trust
        Score and certifications, not this.
      </Lede>

      <Section>
        <SectionTitle>What are you good at?</SectionTitle>
        <SectionHint>Pick as many as apply. It changes what gets recommended.</SectionHint>
        <Chips>
          {(options?.skills ?? []).map((s) => (
            <Chip
              key={s}
              type="button"
              role="switch"
              aria-checked={profile.skills.includes(s)}
              $on={profile.skills.includes(s)}
              onClick={() => save({ skills: toggle(profile.skills, s) })}
            >
              {LABEL[s] ?? s}
            </Chip>
          ))}
        </Chips>
      </Section>

      <Section>
        <SectionTitle>Where do you sell?</SectionTitle>
        <SectionHint>Stock that does well at those places gets ranked higher for you.</SectionHint>
        <Chips>
          {(options?.venues ?? []).map((v) => (
            <Chip
              key={v}
              type="button"
              role="switch"
              aria-checked={profile.venues.includes(v)}
              $on={profile.venues.includes(v)}
              onClick={() => save({ venues: toggle(profile.venues, v) })}
            >
              {LABEL[v] ?? v}
            </Chip>
          ))}
        </Chips>
      </Section>

      <Section>
        <SectionTitle>How do you get around?</SectionTitle>
        {/* A real constraint: recommending a bulky pickup to someone on foot wastes their trip. */}
        <SectionHint>So we don’t send you for more than you can carry.</SectionHint>
        <Chips>
          {(options?.transport ?? []).map((t) => (
            <Chip
              key={t}
              type="button"
              role="radio"
              aria-checked={profile.transport === t}
              $on={profile.transport === t}
              onClick={() => save({ transport: t as SellerTransport })}
            >
              {TRANSPORT_ICON[t as SellerTransport]}
              {LABEL[t] ?? t}
            </Chip>
          ))}
        </Chips>
      </Section>

      {/* Never merged with the declared fields — see the module comment. */}
      {profile.inferred.sampleSize > 0 ? (
        <Inferred>
          <InferredHead>
            <Sparkles size={14} aria-hidden />
            <b>What we’ve noticed</b>
          </InferredHead>
          <InferredBody>
            {profile.inferred.categories.length > 0 ? (
              <li>
                You sell most in <b>{profile.inferred.categories.join(', ')}</b>.
              </li>
            ) : null}
            {profile.inferred.sellThrough !== null ? (
              <li>
                About <b>{profile.inferred.sellThrough}</b> items sold per pickup.
              </li>
            ) : null}
            {profile.inferred.activeHours.length > 0 ? (
              <li>
                Your sales cluster around{' '}
                <b>{profile.inferred.activeHours.map((h) => `${h}:00`).join(', ')}</b>.
              </li>
            ) : null}
          </InferredBody>
          <InferredFoot>
            Based on {profile.inferred.sampleSize} sale
            {profile.inferred.sampleSize === 1 ? '' : 's'} — we lean on this more as you sell more.
          </InferredFoot>
        </Inferred>
      ) : null}
    </TabPage>
  );
}

const Lede = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
`;
const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.space[5]}px;
`;
const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;
`;
const SectionHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 2px 0 ${({ theme }) => theme.space[3]}px;
`;
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Chip = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid ${({ theme, $on }) => ($on ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $on }) => ($on ? theme.color.accentPrimary : 'transparent')};
  color: ${({ theme, $on }) => ($on ? '#fff' : theme.color.textSecondary)};
`;
const Inferred = styled.section`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const InferredHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.accentPrimary};

  b {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const InferredBody = styled.ul`
  display: grid;
  gap: 4px;
  margin: ${({ theme }) => theme.space[2]}px 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};

  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const InferredFoot = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
