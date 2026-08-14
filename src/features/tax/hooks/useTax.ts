'use client';

/**
 * Tax statements (Phase 5). A seller needs a defensible summary of what they earned through the
 * platform in order to file their own taxes.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { RemittanceReport, SellerTaxStatement } from '../types';

export function useSellerTaxStatement(year: number) {
  return useQuery<SellerTaxStatement>({
    queryKey: keys.taxStatement(year),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            year,
            subjectType: 'seller',
            subjectId: 'demo',
            grossSalesCents: 0,
            digitalGrossCents: 0,
            salesTaxCollectedByPlatformCents: 0,
            platformFeesCents: 0,
            refundsCents: 0,
            inventoryLiabilitiesCents: 0,
            netEarningsCents: 0,
            settlementCount: 0,
            note: '',
            generatedAt: new Date().toISOString(),
          })
        : api.get<SellerTaxStatement>(endpoints.sellerTaxStatement, { query: { year } }),
    staleTime: 60_000,
  });
}

/** Finance-only: the open sales-tax liability per filing jurisdiction. */
export function useRemittanceReport() {
  return useQuery<RemittanceReport>({
    queryKey: keys.taxRemittance,
    queryFn: () => api.get<RemittanceReport>(endpoints.taxRemittance),
    staleTime: 30_000,
  });
}
