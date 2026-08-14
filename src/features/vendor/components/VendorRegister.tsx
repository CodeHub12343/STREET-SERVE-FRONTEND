'use client';

/**
 * V-01 Vendor Registration (BP-3, BUSINESS_REGISTRATION_REDESIGN.md).
 *
 * Category-first: the category resolves an archetype, which decides the remaining steps — a food
 * truck is asked for a menu item and never sees "appointment"; a mechanic sets a call-out fee and
 * never sees "menu". Four steps for everyone, but step 3 differs.
 *
 * What this replaces, and why it mattered:
 *   • the old step 2 collected a free-text service area with NO backend field — silently discarded
 *   • the old step 3 "Get paid" was a banner that never called Stripe, so you finished
 *     registration unable to get paid
 *   • nothing configured hours (the DB field existed with no UI), a menu, or services
 *
 * Everything except name + category is skippable; a skip becomes a setup-checklist item (BP-4)
 * rather than a dead end.
 */
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banner } from '@/components/feedback/Banner';
import { Button } from '@/components/primitives/Button';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { AppApiError } from '@/lib/api/errors';
import {
  archetypeOf,
  defaultHours,
  useCategories,
  useSuggestCategory,
  type HoursEntry,
} from '../registration';
import { CategoryPicker } from './register/CategoryPicker';
import { BasicsStep } from './register/BasicsStep';
import { ArchetypeStep, type ArchetypeDraft } from './register/ArchetypeStep';

const TOTAL = 4;
const EMPTY_DRAFT: ArchetypeDraft = {
  itemName: '',
  priceCents: '',
  durationMin: '30',
  travelFeeCents: '',
};

const toCents = (v: string): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export function VendorRegister() {
  const router = useRouter();
  const { show } = useToast();
  const qc = useQueryClient();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const suggestCategory = useSuggestCategory();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Step 1
  const [categoryId, setCategoryId] = useState('');
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherName, setOtherName] = useState('');
  // Step 2
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [hours, setHours] = useState<HoursEntry[]>(defaultHours());
  const [center, setCenter] = useState<[number, number] | undefined>();
  const [radiusM, setRadiusM] = useState(5000);
  // Step 3
  const [draft, setDraft] = useState<ArchetypeDraft>(EMPTY_DRAFT);

  const category = useMemo(
    () => categories?.find((c) => c._id === categoryId),
    [categories, categoryId],
  );
  const archetype = archetypeOf(category);

  /**
   * "Something else" still needs a real category row to attach to, so we register under the
   * closest match and file a suggestion — the vendor is never blocked by a taxonomy gap.
   */
  const fallbackCategoryId = useMemo(
    () => categories?.find((c) => c.slug === 'handmade-crafts')?._id ?? categories?.[0]?._id ?? '',
    [categories],
  );
  const effectiveCategoryId = otherSelected ? fallbackCategoryId : categoryId;

  const create = useMutation({
    mutationFn: async (): Promise<string> => {
      if (isMapDemo) return 'biz_demo';
      const biz = await api.post<{ id: string }>(endpoints.businesses, {
        name: name.trim(),
        categoryId: effectiveCategoryId,
        ...(logoUrl ? { logoUrl } : {}),
      });
      return biz.id;
    },
  });

  /**
   * Create exactly once. Both finishing paths (skip / connect payouts) need the business, and
   * `mutateAsync` would happily create a second one — memoise the id instead.
   */
  const createdIdRef = useRef<string | null>(null);
  const ensureBusiness = async (): Promise<string> => {
    if (createdIdRef.current) return createdIdRef.current;
    const id = await create.mutateAsync();
    createdIdRef.current = id;
    return id;
  };

  /**
   * Persist the whole wizard. Everything after creation is best-effort — a failed detail must warn
   * and move on, never lose the business the vendor just created.
   */
  const saveAll = async (): Promise<string> => {
    const businessId = await ensureBusiness();
    if (isMapDemo) return businessId;

    // Basics — the fields the old wizard asked for and threw away.
    const patch: Record<string, unknown> = {};
    if (hours.length > 0) patch.hours = hours;
    if (center) {
      patch.serviceArea = center;
      patch.serviceRadiusM = radiusM;
    }
    const travel = toCents(draft.travelFeeCents);
    if (travel !== null) patch.travelFeeCents = travel;
    if (Object.keys(patch).length > 0) {
      await api.patch(endpoints.business(businessId).root, patch).catch(() => {
        show('Saved your business — some details need another go in settings', 'warning');
      });
    }

    // The archetype's first listing, if they filled it in.
    const price = toCents(draft.priceCents);
    if (draft.itemName.trim() && price !== null) {
      const sellsProducts = archetype === 'counter_serve' || archetype === 'goods_seller';
      const path = sellsProducts
        ? endpoints.business(businessId).menu
        : endpoints.business(businessId).services;
      // Menu items and services both accept an optional listing photo.
      const photo = draft.photoUrl ? { photoUrl: draft.photoUrl } : {};
      const body = sellsProducts
        ? { name: draft.itemName.trim(), priceCents: price, ...photo }
        : {
            name: draft.itemName.trim(),
            priceCents: price,
            durationMin: Number(draft.durationMin) || 30,
            ...photo,
          };
      await api.post(path, body).catch(() => {
        show('Business created — add your first item from the dashboard', 'warning');
      });
    }

    if (otherSelected && otherName.trim()) {
      await suggestCategory
        .mutateAsync({ businessId, proposedName: otherName.trim() })
        .catch(() => undefined);
    }

    return businessId;
  };

  const finish = async () => {
    setBusy(true);
    try {
      await saveAll();
      await qc.invalidateQueries({ queryKey: keys.myBusinesses });
      show('Your business is set up — go live to start earning', 'success');
      router.replace('/vendor');
    } catch (e) {
      show(
        e instanceof AppApiError ? e.message : 'Could not create your business. Please try again.',
        'danger',
      );
    } finally {
      setBusy(false);
    }
  };

  /** The real Connect call — the old step 3 only described this and never made it. */
  const connectPayouts = async () => {
    setBusy(true);
    try {
      const businessId = await saveAll();
      await qc.invalidateQueries({ queryKey: keys.myBusinesses });
      if (isMapDemo) {
        show('Payouts are simulated in demo mode', 'default');
        router.replace('/vendor');
        return;
      }
      const { url } = await api.post<{ url: string }>(
        endpoints.business(businessId).payoutsOnboard,
      );
      // Stripe's hosted flow returns to CONNECT_RETURN_URL (configured backend-side).
      window.location.assign(url);
    } catch (e) {
      setBusy(false);
      // The business exists — losing Stripe is recoverable from the dashboard.
      show(
        e instanceof AppApiError ? e.message : 'Could not open Stripe. You can connect later.',
        'danger',
      );
    }
  };

  const next = () => {
    setError(undefined);
    if (step === 1) {
      if (!otherSelected && !categoryId) return setError('Pick what kind of business you run');
      if (otherSelected && !otherName.trim()) return setError('Tell us what kind of business it is');
      if (otherSelected && !fallbackCategoryId) return setError('Categories are still loading');
    }
    if (step === 2 && !name.trim()) return setError('Enter your business name');
    setStep((s) => Math.min(s + 1, TOTAL));
  };

  const title =
    step === 1
      ? 'What kind of business?'
      : step === 2
        ? 'About your business'
        : step === 3
          ? 'Your first listing'
          : 'Get paid';

  return (
    <WizardFlow
      totalSteps={TOTAL}
      currentStep={step}
      title={title}
      onBack={step > 1 ? () => setStep((s) => s - 1) : () => router.back()}
      footer={
        step < TOTAL ? (
          <Footer>
            <Button fullWidth onClick={next}>
              Continue
            </Button>
            {step === 3 ? (
              <Button variant="tertiary" fullWidth onClick={() => setStep(TOTAL)}>
                I’ll add this later
              </Button>
            ) : null}
          </Footer>
        ) : (
          <Footer>
            <Button fullWidth loading={busy} onClick={() => void connectPayouts()}>
              Connect payouts
            </Button>
            <Button variant="tertiary" fullWidth disabled={busy} onClick={() => void finish()}>
              Skip — I’ll do this later
            </Button>
          </Footer>
        )
      }
    >
      {step === 1 ? (
        <>
          <CategoryPicker
            categories={categories}
            isLoading={catsLoading}
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              setOtherSelected(false);
            }}
            otherName={otherName}
            onOtherNameChange={setOtherName}
            otherSelected={otherSelected}
            onSelectOther={() => {
              setOtherSelected(true);
              setCategoryId('');
            }}
          />
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {category?.requires_license ? (
            <Banner tone="warning" title="This category needs a licence">
              {category.name} requires a valid licence
              {category.regulated_by ? ` from the ${category.regulated_by}` : ''} before you can go
              live. You can register now and upload it right after.
            </Banner>
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <BasicsStep
          name={name}
          onName={setName}
          logoUrl={logoUrl}
          onLogoUrl={setLogoUrl}
          hours={hours}
          onHours={setHours}
          center={center}
          onCenter={setCenter}
          radiusM={radiusM}
          onRadiusM={setRadiusM}
          error={error}
        />
      ) : null}

      {step === 3 ? (
        <ArchetypeStep
          archetype={archetype}
          businessName={name}
          draft={draft}
          onDraft={setDraft}
        />
      ) : null}

      {step === 4 ? (
        <Wrap>
          <Banner tone="info" title="Payouts via Stripe">
            We use Stripe Connect for secure payouts — StreetServe never sees your bank details.
            You’ll finish on Stripe’s own hosted page and come straight back.
          </Banner>
          <Hint>
            Bronze tier starts with a 3-day payout hold; it speeds up as your trust grows. You can
            skip this and connect later, but you’ll need it before money can reach you.
          </Hint>
        </Wrap>
      ) : null}
    </WizardFlow>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Footer = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
