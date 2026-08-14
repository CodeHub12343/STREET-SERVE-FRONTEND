'use client';

/**
 * S-01 Seller intro (docs/13 S-01) — the "earn today / you owe nothing until you sell" pitch that
 * reduces first-sale anxiety (docs/06 §1). Leads into discovering inventory.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Wallet, PackageCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useSellerOnboardingStore } from '@/stores/sellerOnboarding.store';

export function SellerIntro() {
  const router = useRouter();
  const introSeen = useSellerOnboardingStore((s) => s.introSeen);
  const markIntroSeen = useSellerOnboardingStore((s) => s.markIntroSeen);

  // Returning sellers have seen the pitch — forward them straight to Discover so this screen only
  // ever fronts the very first visit. `replace` keeps it out of the back stack.
  useEffect(() => {
    if (introSeen) router.replace('/seller');
  }, [introSeen, router]);

  const start = () => {
    markIntroSeen();
    router.push('/seller');
  };

  return (
    <Wrap>
      <Hero>
        <h1>Earn today — no capital needed</h1>
        <p>Take inventory from a nearby hub, sell it on the street, and keep your share. You owe nothing until you sell — return anything unsold for $0.</p>
      </Hero>
      <Points>
        <Point><PackageCheck size={22} aria-hidden /><div><b>Grab stock free</b><span>Reserve consignment inventory at a hub near you.</span></div></Point>
        <Point><Wallet size={22} aria-hidden /><div><b>Keep your split</b><span>Every sale pays you your share automatically.</span></div></Point>
        <Point><RotateCcw size={22} aria-hidden /><div><b>Return the rest</b><span>Bring back what didn’t sell — no cost, no penalty.</span></div></Point>
      </Points>
      <Button fullWidth onClick={start}>
        Find inventory near me
      </Button>
    </Wrap>
  );
}

const Wrap = styled.div`
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px calc(${({ theme }) => theme.space[6]}px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: ${({ theme }) => theme.space[5]}px;
`;
const Hero = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  h1 {
    font-size: clamp(28px, 7vw, 36px);
    letter-spacing: -0.02em;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 16px;
  }
`;
const Points = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  align-content: center;
`;
const Point = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.statusDiscount};
  }
  b {
    display: block;
    font-size: 15px;
  }
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
