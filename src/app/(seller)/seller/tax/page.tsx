import type { Metadata } from 'next';
import { TaxStatement } from '@/features/tax';

export const metadata: Metadata = { title: 'Tax statement' };

export default function TaxPage() {
  return <TaxStatement />;
}
