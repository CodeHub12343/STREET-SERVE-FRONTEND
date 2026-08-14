'use client';

/**
 * Seller-side rent-to-own listings (roadmap 2.7).
 *
 * This is where the terms of an RTO deal are actually set. Before it existed, `POST /rto/agreements`
 * read the price and schedule from the CUSTOMER's request — so the seller was never asked what they
 * were offering. Everything published here is what the customer will be held to, and the live
 * preview below the form is the same server-computed disclosure the customer sees, so a seller
 * cannot publish a deal whose real cost surprises them either.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Pause, Play, Plus, Trash2 } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { TextArea } from '@/components/primitives/TextArea';
import { Switch } from '@/components/primitives/Switch';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { AppApiError } from '@/lib/api/errors';
import { useCategories } from '@/features/vendor/registration';
import {
  useCreateRtoListing,
  useRtoEligibility,
  useMyRtoListings,
  useRtoDisclosure,
  useSetRtoListingStatus,
} from '../hooks/useRto';
import type { RtoFrequency } from '../types';

const FREQUENCIES: { value: RtoFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'twice_monthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

function dollarsToCents(v: string): number {
  const n = Math.round(Number(v.replace(/[^0-9.]/g, '')) * 100);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function SellerRtoListings({ businessId, citySlug }: { businessId: string; citySlug: string }) {
  const { show } = useToast();
  const { data: listings, isLoading } = useMyRtoListings(businessId);
  const { data: categories } = useCategories();
  /**
   * Asked on load, not on submit. The approval gate is correct — renting to own is credit-like and
   * R27/§60.3 requires a human to clear each seller — but it used to fire only when Publish was
   * pressed, after the vendor had entered a cash price, term, frequency, markup, quantity and both
   * toggles. Same shape of mistake as validating artwork after payment.
   */
  const { data: eligibility } = useRtoEligibility(businessId, citySlug);
  const blocked = eligibility ? !eligibility.eligible : false;
  const create = useCreateRtoListing(businessId);
  const setStatus = useSetRtoListingStatus(businessId);

  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cashStr, setCashStr] = useState('');
  const [initialStr, setInitialStr] = useState('');
  const [count, setCount] = useState('12');
  const [frequency, setFrequency] = useState<RtoFrequency>('weekly');
  const [markupPct, setMarkupPct] = useState('20');
  const [quantity, setQuantity] = useState('1');
  const [returnAllowed, setReturnAllowed] = useState(false);
  const [sellerMaintains, setSellerMaintains] = useState(false);

  const cashPriceCents = dollarsToCents(cashStr);
  const installmentCount = Math.max(1, Number(count) || 1);
  const markupBps = Math.max(0, Math.round(Number(markupPct) * 100) || 0);

  /**
   * The seller's own §44 preview, from the same endpoint the customer's screen uses. Publishing a
   * deal you have not seen priced is how a seller ends up surprised by their own offer.
   */
  const quote = useMemo(
    () =>
      cashPriceCents > 0
        ? {
            cashPriceCents,
            initialPaymentCents: dollarsToCents(initialStr),
            installmentCount,
            frequency,
            markupBps,
          }
        : null,
    [cashPriceCents, initialStr, installmentCount, frequency, markupBps],
  );
  const preview = useRtoDisclosure(quote);

  const canSubmit = productName.trim().length > 1 && cashPriceCents > 0 && categoryId !== '';

  const submit = () =>
    create.mutate(
      {
        sellerId: businessId,
        productName: productName.trim(),
        description: description.trim() || undefined,
        categoryId,
        citySlug,
        cashPriceCents,
        initialPaymentCents: dollarsToCents(initialStr),
        installmentCount,
        frequency,
        markupBps,
        quantityAvailable: Math.max(1, Number(quantity) || 1),
        listingTerms: {
          returnAllowed,
          maintenanceResponsibility: sellerMaintains ? 'seller' : 'customer',
        },
      },
      {
        onSuccess: () => {
          show('Offer published', 'success');
          setOpen(false);
          setProductName('');
          setCashStr('');
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not publish the offer', 'danger'),
      },
    );

  return (
    <TabPage title="Rent to own" backHref="/vendor" backLabel="Back to dashboard">
      {blocked ? (
        <Banner tone="warning" title="You cannot publish Rent-to-Own offers yet">
          <BlockerList>
            {eligibility!.blockers.map((b) => (
              <li key={b.code}>{b.message}</li>
            ))}
          </BlockerList>
        </Banner>
      ) : null}

      <Head>
        {/*
          The button is disabled rather than hidden: a vendor who came here from the dashboard needs
          to see that the feature exists and why it is closed to them, not find an empty page.
        */}
        <Button size="compact" disabled={blocked} onClick={() => setOpen((v) => !v)}>
          <Plus size={15} aria-hidden /> {open ? 'Close' : 'New offer'}
        </Button>
      </Head>

      {open && !blocked ? (
        <Form>
          <Input label="What you're offering" value={productName} onChange={(e) => setProductName(e.target.value)} />
          <TextArea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Choose a category"
            options={(categories ?? []).map((c) => ({ value: c._id, label: c.name }))}
          />
          <Two>
            <Input label="Cash price" inputMode="decimal" placeholder="$0.00" value={cashStr} onChange={(e) => setCashStr(e.target.value)} />
            <Input label="Up front" inputMode="decimal" placeholder="$0.00" value={initialStr} onChange={(e) => setInitialStr(e.target.value)} />
          </Two>
          <Two>
            <Input label="Number of payments" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
            <Select
              label="How often"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RtoFrequency)}
              options={FREQUENCIES}
            />
          </Two>
          <Two>
            <Input label="Markup %" inputMode="decimal" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} />
            <Input label="How many available" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Two>

          <Toggles>
            <Switch
              label="I'll maintain it during the term"
              checked={sellerMaintains}
              onChange={setSellerMaintains}
            />
            <Switch
              label="Customer can return it early"
              checked={returnAllowed}
              onChange={setReturnAllowed}
            />
            {/* The conservative default is stated, not assumed — the customer will be told this
                either way, so the seller should see it before they publish. */}
            <Note>
              {returnAllowed
                ? 'Previous payments are not refunded on a return unless you agree otherwise in writing.'
                : 'Customers cannot hand this back before the term ends.'}
            </Note>
          </Toggles>

          {preview.data ? (
            <Preview>
              <PreviewRow>
                <span>Customer pays</span>
                <b className="tnum">
                  {formatCents(preview.data.installmentAmountCents)} × {preview.data.installmentCount}
                </b>
              </PreviewRow>
              <PreviewRow>
                <span>Total to own</span>
                <b className="tnum">{formatCents(preview.data.totalToOwnCents)}</b>
              </PreviewRow>
              <PreviewRow>
                <span>Over the cash price</span>
                <b className="tnum">{formatCents(preview.data.costOverCashCents)}</b>
              </PreviewRow>
              <Disclosure>{preview.data.disclosure}</Disclosure>
            </Preview>
          ) : null}

          <Button fullWidth disabled={!canSubmit} loading={create.isPending} onClick={submit}>
            Publish offer
          </Button>
        </Form>
      ) : null}

      {isLoading ? (
        <Skeleton $h="120px" $radius={16} />
      ) : (listings ?? []).length === 0 ? (
        <EmptyState
          title="No offers yet"
          description="Publish what you're willing to rent to own, and the terms you're offering."
        />
      ) : (
        <List>
          {(listings ?? []).map((l) => (
            <Card key={l.id}>
              <CardHead>
                <div>
                  <Name>{l.productName}</Name>
                  <Sub className="tnum">
                    {formatCents(l.cashPriceCents)} cash · {l.installmentCount} payments ·{' '}
                    {l.quantityAvailable} left
                  </Sub>
                </div>
                <State $on={l.status === 'active'}>{l.status}</State>
              </CardHead>
              <Actions>
                <Button
                  size="compact"
                  variant="tertiary"
                  loading={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({ id: l.id, status: l.status === 'active' ? 'paused' : 'active' })
                  }
                >
                  {l.status === 'active' ? (
                    <>
                      <Pause size={14} aria-hidden /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={14} aria-hidden /> Resume
                    </>
                  )}
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  onClick={() => setStatus.mutate({ id: l.id, status: 'withdrawn' })}
                >
                  <Trash2 size={14} aria-hidden /> Withdraw
                </Button>
              </Actions>
            </Card>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const BlockerList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
`;
const Head = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Two = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Toggles = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Note = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Preview = styled.div`
  display: grid;
  gap: 6px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Disclosure = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.article`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardHead = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const Sub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const State = styled.span<{ $on: boolean }>`
  flex: none;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $on }) => ($on ? theme.color.statusLive : theme.color.textTertiary)};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
