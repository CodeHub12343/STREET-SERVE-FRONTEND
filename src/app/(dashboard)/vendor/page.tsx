'use client';

import styled from 'styled-components';
import { LiveStatusControl, SetupChecklist, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorHomePage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate>
      {(businessId) => (
        <Stack>
          <LiveStatusControl businessId={businessId} />
          {/* Below the live control: getting live is the job, finishing setup is the nudge. */}
          <SetupChecklist businessId={businessId} />
        </Stack>
      )}
    </VendorBusinessGate>
  );
}

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
