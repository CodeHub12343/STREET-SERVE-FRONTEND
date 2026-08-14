'use client';

/**
 * V-09 Modules — the self-service surface for the business's capabilities
 * (BUSINESS_MODULE_SYSTEM.md §5). Turn a capability on and it appears in the dashboard nav and on
 * the customer profile; turn it off and it disappears — existing data is never destroyed.
 *
 * Locked modules show WHY rather than a disabled control with no explanation: core capabilities
 * are the platform, and auto ones (licence, hub tools) follow from the business's own data.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Check, Lock } from 'lucide-react';
import { Switch } from '@/components/primitives/Switch';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import {
  useBusinessModules,
  useSetBusinessModules,
  type BusinessModule,
} from '../hooks/useBusinessModules';
import { COMMERCE_MODULES } from '@/features/business/hooks/useBusinessModules';

/** How the exclusive commerce choice reads to an owner — plain trade language, not module names. */
const COMMERCE_META: Record<string, { label: string; body: string }> = {
  ordering: {
    label: 'Take orders',
    body: 'Customers buy from your list and you fulfil it — goods, food, anything on the spot.',
  },
  booking: {
    label: 'Take bookings',
    body: 'Customers reserve a time slot with you in advance, from your list of services.',
  },
};

const META: Record<BusinessModule, { label: string; body: string }> = {
  live_presence: { label: 'Live status', body: 'Appear on the map when you go live.' },
  profile: { label: 'Business profile', body: 'Your public page on StreetServe.' },
  reviews: { label: 'Reviews', body: 'Customers rate you after a sale.' },
  messaging: { label: 'Messages', body: 'Chat with customers.' },
  payouts: { label: 'Payouts', body: 'Get paid out to your bank.' },
  analytics: { label: 'Analytics', body: 'See what’s selling and when.' },
  licensing: { label: 'License', body: 'Upload the licence your category requires.' },
  hub_operations: { label: 'Hub tools', body: 'Inventory, approvals and settlements for a hub.' },
  menu: { label: 'Menu', body: 'A product list customers order from.' },
  ordering: { label: 'Online ordering', body: 'Take and manage orders in the app.' },
  queue: { label: 'Line-up & discounts', body: 'A live queue with early-bird discounts.' },
  wave_down: { label: 'Wave-downs', body: 'Customers flag you down where they are.' },
  services: { label: 'Services', body: 'What you do, how long it takes, what it costs.' },
  booking: { label: 'Bookings', body: 'Customers book a time slot in advance.' },
  catalog: { label: 'Catalog', body: 'List physical goods for sale.' },
  consignment: { label: 'Consignment', body: 'Supply street sellers with your stock.' },
  gifting: { label: 'Gift cards', body: 'Customers buy for a friend to redeem.' },
  giveaways: { label: 'Giveaways', body: 'Run promotions to pull a crowd.' },
  pay_it_forward: {
    label: 'Pay It Forward',
    body: 'Customers leave money for the next person who needs it.',
  },
  ping_sharing: { label: 'Ping sharing', body: 'Pay customers who bring you customers.' },
  ai_assistant: { label: 'AI assistant', body: 'Suggestions on what to sell and where.' },
};

export function ModulesManager({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data, isLoading } = useBusinessModules(businessId);
  const save = useSetBusinessModules(businessId);
  const [pending, setPending] = useState<BusinessModule | null>(null);

  if (isLoading || !data) {
    return (
      <Wrap>
        <Skeleton $h="240px" $radius={16} />
      </Wrap>
    );
  }

  const toggle = (mod: BusinessModule, on: boolean) => {
    const next = on ? [...data.enabled, mod] : data.enabled.filter((m) => m !== mod);
    setPending(mod);
    save.mutate(next, {
      onSuccess: () => show(`${META[mod].label} ${on ? 'turned on' : 'turned off'}`, 'success'),
      onError: (e) =>
        show(
          e instanceof AppApiError ? e.message : `Could not update ${META[mod].label}`,
          'danger',
        ),
      onSettled: () => setPending(null),
    });
  };

  /**
   * Switching commerce mode is one atomic write, never "off then on" — a business must never be
   * momentarily neither, and the server would reject a body holding both anyway.
   */
  const chooseCommerce = (mod: BusinessModule) => {
    const next = [...data.enabled.filter((m) => !COMMERCE_MODULES.includes(m)), mod];
    setPending(mod);
    save.mutate(next, {
      onSuccess: () => show(`Now taking ${mod === 'booking' ? 'bookings' : 'orders'}`, 'success'),
      onError: (e) =>
        show(e instanceof AppApiError ? e.message : 'Could not change how you sell', 'danger'),
      onSettled: () => setPending(null),
    });
  };

  // The exclusive pair is presented as a choice; everything else stays an independent switch.
  const commerceChoices = data.available.filter((m) => COMMERCE_MODULES.includes(m));

  // Everything the category offers, minus core (shown separately as "always on") and minus the
  // commerce pair, which has its own section above.
  const optional = data.available.filter(
    (m) => !data.core.includes(m) && !COMMERCE_MODULES.includes(m),
  );
  const lockedAuto = data.locked.filter((m) => !data.core.includes(m));

  return (
    <Wrap>
      <Head>
        <h1>Modules</h1>
        <p>
          Turn on only what your business actually needs. Turning something off hides it — it never
          deletes anything you’ve already created.
        </p>
      </Head>

      {commerceChoices.length > 0 ? (
        <Section>
          <h2>How you sell</h2>
          <Fine>
            A business takes orders <em>or</em> takes bookings — never both. This is the one choice
            everything else follows from.
          </Fine>
          <List role={commerceChoices.length > 1 ? 'radiogroup' : undefined}>
            {commerceChoices.map((mod) => {
              const on = data.commerceMode === mod;
              const only = commerceChoices.length === 1;
              const copy = COMMERCE_META[mod] ?? META[mod];
              return (
                <Choice
                  key={mod}
                  type="button"
                  role={only ? undefined : 'radio'}
                  aria-checked={only ? undefined : on}
                  aria-disabled={only || undefined}
                  $on={on}
                  disabled={only || (save.isPending && pending === mod)}
                  onClick={() => chooseCommerce(mod)}
                >
                  <Info>
                    <RowTitle>{copy.label}</RowTitle>
                    <RowBody>{copy.body}</RowBody>
                  </Info>
                  {on ? <Check size={18} aria-hidden /> : null}
                </Choice>
              );
            })}
          </List>
          {commerceChoices.length === 1 ? (
            <Fine>
              Your category is built for this one. To sell the other way, change your business
              category — you can’t run both from a single account.
            </Fine>
          ) : null}
        </Section>
      ) : null}

      {optional.length === 0 ? (
        <Banner tone="info" title="Nothing to configure yet">
          Your category runs on the core StreetServe capabilities.
        </Banner>
      ) : (
        <List>
          {optional.map((mod) => {
            const isLocked = lockedAuto.includes(mod);
            const on = data.enabled.includes(mod);
            return (
              <Row key={mod} $locked={isLocked}>
                <Info>
                  <RowTitle>
                    {META[mod].label}
                    {isLocked ? (
                      <LockTag>
                        <Lock size={11} /> required
                      </LockTag>
                    ) : null}
                  </RowTitle>
                  <RowBody>
                    {isLocked
                      ? mod === 'licensing'
                        ? 'Your category is regulated, so this stays on.'
                        : 'This follows from your business setup and stays on.'
                      : META[mod].body}
                  </RowBody>
                </Info>
                <Switch
                  checked={on}
                  disabled={isLocked || (save.isPending && pending === mod)}
                  label={META[mod].label}
                  onChange={(next) => toggle(mod, next)}
                />
              </Row>
            );
          })}
        </List>
      )}

      <Section>
        <h2>Always on</h2>
        <Fine>{data.core.map((m) => META[m].label).join(' · ')}</Fine>
      </Section>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
const Head = styled.div`
  display: grid;
  gap: 6px;
  h1 {
    font-size: 24px;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 14px;
    max-width: 60ch;
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div<{ $locked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  opacity: ${({ $locked }) => ($locked ? 0.75 : 1)};
`;
/** The commerce choice — same card as a module Row, but selectable and self-evidently one-of. */
const Choice = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  text-align: left;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.accentPrimary : theme.color.line)};
  box-shadow: ${({ theme, $on }) => ($on ? `inset 0 0 0 1px ${theme.color.accentPrimary}` : 'none')};
  color: inherit;
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  svg {
    color: ${({ theme }) => theme.color.accentPrimary};
    flex: none;
  }
`;
const Info = styled.div`
  min-width: 0;
`;
const RowTitle = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
`;
const LockTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const RowBody = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Section = styled.section`
  display: grid;
  gap: 6px;
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const Fine = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
