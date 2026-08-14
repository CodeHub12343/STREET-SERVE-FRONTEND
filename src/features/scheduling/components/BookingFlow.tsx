'use client';

/**
 * C-26 Booking flow (docs/13 C-26) — service → slot picker → confirm. Cutoff-checked server-side;
 * demo confirms immediately. Idempotent booking creation (bookings are 💳).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useBusiness } from '@/features/business';
import { formatCents } from '@/lib/money';
import { newIdempotencyKey } from '@/lib/idempotency';
import { useAvailability, useCreateBooking, useServices } from '../hooks/useScheduling';

const todayISODate = () => new Date().toISOString().slice(0, 10);

export function BookingFlow({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: biz } = useBusiness(businessId);
  const { data: services, isLoading: servicesLoading } = useServices(businessId);
  const create = useCreateBooking();
  const idemKey = useRef(newIdempotencyKey());

  const [serviceId, setServiceId] = useState<string>();
  const [date, setDate] = useState<string>(todayISODate());
  const [slot, setSlot] = useState<string>();

  // Default to the first service once loaded.
  useEffect(() => {
    const first = services?.[0];
    if (!serviceId && first) setServiceId(first.id);
  }, [services, serviceId]);

  const selectedService = services?.find((s) => s.id === serviceId);
  const { data: slots, isLoading: slotsLoading } = useAvailability(businessId, serviceId, date);

  const confirm = () => {
    if (!biz || !slot || !selectedService) return;
    create.mutate(
      {
        businessId,
        businessName: biz.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        scheduledAt: slot,
        priceCents: selectedService.priceCents,
        idempotencyKey: idemKey.current,
      },
      {
        onSuccess: (b) => {
          show('Booking confirmed', 'success');
          router.replace(`/booking/${b.id}`);
        },
        onError: () => show('Could not confirm the booking', 'danger'),
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title={`Book ${biz?.name ?? ''}`.trim()}
      onBack={() => router.back()}
      footer={
        <Button
          fullWidth
          disabled={!slot || !selectedService}
          loading={create.isPending}
          onClick={confirm}
        >
          {slot && selectedService
            ? `Confirm · ${formatCents(selectedService.priceCents)}`
            : 'Pick a time'}
        </Button>
      }
    >
      {servicesLoading ? (
        <Skeleton $h="60px" $radius={16} />
      ) : !services || services.length === 0 ? (
        <Empty>This business hasn’t published any bookable services yet.</Empty>
      ) : (
        <>
          <Select
            label="Service"
            options={services.map((s) => ({
              value: s.id,
              label: `${s.name} · ${formatCents(s.priceCents)}`,
            }))}
            value={serviceId ?? ''}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSlot(undefined);
            }}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot(undefined);
            }}
          />

          <SectionTitle>Choose a time</SectionTitle>
          {slotsLoading ? (
            <Skeleton $h="120px" $radius={16} />
          ) : (slots ?? []).length === 0 ? (
            <Empty>No open times for this day — try another date.</Empty>
          ) : (
            <Slots>
              {(slots ?? []).map((s) => (
                <SlotButton key={s.value} $active={slot === s.value} onClick={() => setSlot(s.value)}>
                  {s.label}
                </SlotButton>
              ))}
            </Slots>
          )}
        </>
      )}
    </WizardFlow>
  );
}

const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Slots = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Empty = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  padding: ${({ theme }) => theme.space[3]}px 0;
`;
const SlotButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.textPrimary)};
  border: 1.5px solid ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
`;
