'use client';

/**
 * `/vendor/welcome` — the first screen a newly-accepted operator sees.
 *
 * Not just a "you're in" message — a short checklist that tells them exactly what to do next:
 * connect Stripe, go live, see earnings. Each item links straight to the right place.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import Link from 'next/link';
import { CheckCircle2, Radio, Wallet, Receipt, Store } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

interface MembershipRow {
  brandId: string;
  brandName: string;
  role: 'owner' | 'manager' | 'operator';
  isOwner: boolean;
  operators?: { operatorId: string; businessId: string; displayName: string }[];
}

export default function VendorWelcome() {
  const memberships = useQuery<MembershipRow[]>({
    queryKey: ['me', 'brand-memberships'],
    queryFn: () => api.get<MembershipRow[]>(endpoints.myBrandMemberships),
    staleTime: 60_000,
    retry: false,
  });

  if (memberships.isLoading) {
    return (
      <Page>
        <Skeleton $h="320px" $radius={16} />
      </Page>
    );
  }

  const operatorMembership = memberships.data?.find((m) => m.role === 'operator' && !m.isOwner);
  const myTruck = operatorMembership?.operators?.[0]?.displayName;

  return (
    <Page>
      <Hero>
        <HeroIcon>
          <CheckCircle2 size={44} aria-hidden />
        </HeroIcon>
        <h1>Welcome aboard</h1>
        {operatorMembership ? (
          <HeroSub>
            You&apos;re driving{myTruck ? <> <strong>{myTruck}</strong></> : null} for{' '}
            <strong>{operatorMembership.brandName}</strong>.
          </HeroSub>
        ) : (
          <HeroSub>You&apos;ve joined a brand on StreetServe.</HeroSub>
        )}
      </Hero>

      <ChecklistHead>Three things to do before your first sale</ChecklistHead>
      <Checklist>
        <Step href="/vendor/payouts">
          <StepNum>1</StepNum>
          <StepBody>
            <StepTitle>
              <Wallet size={14} aria-hidden /> Connect your Stripe account
            </StepTitle>
            <StepDesc>
              Your share of each sale lands directly in your own bank. The brand owner has
              pre-approved — connect and you&apos;re ready to earn.
            </StepDesc>
          </StepBody>
        </Step>

        <Step href="/vendor">
          <StepNum>2</StepNum>
          <StepBody>
            <StepTitle>
              <Radio size={14} aria-hidden /> Go live when you arrive at a pitch
            </StepTitle>
            <StepDesc>
              Toggle Live from your truck&apos;s dashboard. Your pin lights up on the public
              map; nearby customers see the brand and your truck name.
            </StepDesc>
          </StepBody>
        </Step>

        <Step href="/vendor/orders">
          <StepNum>3</StepNum>
          <StepBody>
            <StepTitle>
              <Receipt size={14} aria-hidden /> Serve orders from the order board
            </StepTitle>
            <StepDesc>
              Accept, prepare, hand off. Payouts settle automatically after each completed
              order — no end-of-day reconciliation.
            </StepDesc>
          </StepBody>
        </Step>
      </Checklist>

      {operatorMembership ? (
        <FooterLinks>
          <FooterLink href={`/brand/${operatorMembership.brandId}/overview`}>
            <Store size={14} aria-hidden /> See the whole brand
          </FooterLink>
          <FooterPrimary href="/vendor">Open my dashboard</FooterPrimary>
        </FooterLinks>
      ) : null}
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Hero = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  text-align: center;
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[4]}px;
  h1 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const HeroIcon = styled.div`
  color: ${({ theme }) => theme.color.statusLive};
  display: grid;
  place-items: center;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;

const HeroSub = styled.p`
  font-size: 15px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const ChecklistHead = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 16px;
  font-weight: 800;
`;

const Checklist = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Step = styled(Link)`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
    border-color: ${({ theme }) => theme.color.accentPrimary};
  }
`;

const StepNum = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 800;
  font-size: 14px;
`;

const StepBody = styled.div`
  display: grid;
  gap: 4px;
`;

const StepTitle = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const StepDesc = styled.p`
  font-size: 13.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const FooterLinks = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;

const FooterLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const FooterPrimary = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  &:hover {
    filter: brightness(1.05);
  }
`;
