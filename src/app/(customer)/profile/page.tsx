'use client';

/**
 * C-34 Profile — the "Role Carousel Header" redesign. Layout mirrors the approved concept sheet:
 *  1. Top row: notification bell · settings gear
 *  2. Greeting ("Hello, Jake 👋") + verification chip, glowing avatar with edit affordance
 *  3. Value proposition — one account, multiple ways to earn
 *  4. RoleCarousel (the signature interaction — see RoleCarousel.tsx) + Explore CTA
 *  5. Wallet / Verification / Notifications, then Settings / Help — each with a subtitle
 * The old corner dropdown is gone from this page; the carousel IS the switcher here (the topbar
 * RoleSwitcher still serves the dashboard surfaces).
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ShieldCheck, Settings, HelpCircle, Wallet, Bell, Pencil, HeartHandshake } from 'lucide-react';
import { Avatar } from '@/components/primitives/Avatar';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { SettingsList, SettingsGroup, SettingsRow } from '@/components/layout/SettingsList';
import { RoleCarousel } from '@/features/identity';
import { NotificationBell } from '@/features/notifications';
import { useMe } from '@/lib/auth/useMe';
import type { VerificationTier } from '@/types';

const TIER_LABEL: Record<VerificationTier, string> = {
  tier0: 'Unverified',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export default function ProfilePage() {
  const router = useRouter();
  const { principal, tier, isLoading } = useMe();
  const firstName = principal?.name?.split(' ')[0];

  return (
    <Wrap>
      <TopRow>
        <NotificationBell />
        <IconBtn type="button" aria-label="Settings" onClick={() => router.push('/settings')}>
          <Settings size={18} />
        </IconBtn>
      </TopRow>

      <Header>
        <Greeting>
          {isLoading ? (
            <Skeleton $w="160px" $h="28px" />
          ) : (
            <Hello>
              Hello, {firstName ?? 'there'} <span aria-hidden>👋</span>
            </Hello>
          )}
          <StatusChip status="parked" label={`${TIER_LABEL[tier ?? 'tier0']} verification`} size="sm" />
        </Greeting>
        <AvatarRing>
          <Avatar name={principal?.name ?? 'You'} src={principal?.photoUrl} size={76} />
          <EditBtn
            type="button"
            aria-label="Edit profile"
            onClick={() => router.push('/onboarding/profile')}
          >
            <Pencil size={12} />
          </EditBtn>
        </AvatarRing>
      </Header>

      <ValueProp>
        One account. <em>Multiple ways to earn.</em>
        <br />
        Switch roles. Unlock more opportunities.
      </ValueProp>

      <RoleCarousel />

      <SettingsList>
        <SettingsGroup>
          <SettingsRow
            label="Wallet"
            description="Balance, payouts & history"
            icon={<Wallet size={18} />}
            onClick={() => router.push('/profile/wallet')}
          />
          <SettingsRow
            label="Verification"
            description="Verify your identity"
            icon={<ShieldCheck size={18} />}
            onClick={() => router.push('/profile/verification')}
          />
          {/*
            A Pay It Forward gift returns no order and no receipt, so without a row here there was
            nowhere in the app to find out whether one had gone through — or whether it had reached
            anyone yet.
          */}
          <SettingsRow
            label="Your gifts"
            description="Pay It Forward you've given"
            icon={<HeartHandshake size={18} />}
            onClick={() => router.push('/pay-it-forward')}
          />
          <SettingsRow
            label="Notifications"
            description="Updates and alerts"
            icon={<Bell size={18} />}
            onClick={() => router.push('/notifications')}
          />
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow
            label="Settings"
            description="App preferences"
            icon={<Settings size={18} />}
            onClick={() => router.push('/settings')}
          />
          <SettingsRow
            label="Help & support"
            description="Get help, view FAQs"
            icon={<HelpCircle size={18} />}
            onClick={() => router.push('/help')}
          />
        </SettingsGroup>
      </SettingsList>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  min-width: 0;
`;
const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px 0;
`;
const IconBtn = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: 0 ${({ theme }) => theme.space[5]}px;
`;
const Greeting = styled.div`
  display: grid;
  gap: 8px;
  justify-items: start;
  min-width: 0;
`;
const Hello = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 26px;
  font-weight: 800;
`;
const AvatarRing = styled.div`
  position: relative;
  flex: none;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(
    140deg,
    ${({ theme }) => theme.color.accentPrimary},
    color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 25%, transparent)
  );
  box-shadow: 0 0 24px color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 30%, transparent);
`;
const EditBtn = styled.button`
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.color.surfaceBase};
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
`;
const ValueProp = styled.p`
  padding: 0 ${({ theme }) => theme.space[5]}px;
  font-size: 15px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textPrimary};
  em {
    font-style: normal;
    font-weight: 700;
    color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
