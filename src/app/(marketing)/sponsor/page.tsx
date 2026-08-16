import type { Metadata } from 'next';
import { SponsorCheckout } from '@/features/marketing/sponsor/SponsorCheckout';

export const metadata: Metadata = {
  title: 'Sponsor StreetServe',
  description:
    'Put your logo on StreetServe and get credited for every person who signs up through your link.',
};

export default function SponsorPage() {
  return <SponsorCheckout />;
}
