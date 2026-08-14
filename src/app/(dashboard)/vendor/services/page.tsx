'use client';

import styled from 'styled-components';
import { BookingHours, ServicesManager, VendorBusinessGate } from '@/features/vendor';
import { useBusinessModules } from '@/features/business/hooks/useBusinessModules';
import { useRequireRole } from '@/lib/auth/guards';

/** Services + the booking hours that make them bookable — one screen, since neither works alone. */
function ServicesWithHours({ businessId }: { businessId: string }) {
  const { data: modules } = useBusinessModules(businessId);
  return (
    <Stack>
      <ServicesManager businessId={businessId} />
      {modules?.enabled.includes('booking') ? <BookingHours businessId={businessId} /> : null}
    </Stack>
  );
}

export default function VendorServicesPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="services">
      {(businessId) => <ServicesWithHours businessId={businessId} />}
    </VendorBusinessGate>
  );
}

const Stack = styled.div`
  display: grid;
  /* minmax(0, …) lets the single column shrink to the viewport instead of inflating to its widest
     child — without it, one card's intrinsic-wide content (the time inputs) stretched every card
     past the screen edge, where the shell's overflow-x: clip cut them all off. */
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
