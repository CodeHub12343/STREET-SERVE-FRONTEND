/**
 * Landing page ('/') — public, server-rendered. LP-1: full 14-section structure with final copy,
 * semantic landmarks, and JSON-LD (Organization + FAQPage built from the same content module the
 * visible FAQ renders — LANDING_PAGE_ACCESSIBILITY.md §2, Checklist §9).
 */
import type { Metadata } from 'next';
import { faq } from '@/features/marketing/content';
import { marketingConfig } from '@/features/marketing/marketing.config';
import {
  BenefitsTabs,
  FaqSection,
  FeatureGrid,
  FinalCta,
  HeroSection,
  HowItWorks,
  ImpactSection,
  MapShowcase,
  MetricsStrip,
  PartnersSection,
  Testimonials,
  TrustSection,
} from '@/features/marketing/components/sections';

const title = 'StreetServe — the live map of your city’s mobile economy';
const description =
  'Every food truck, mobile pro, and street seller on one live map. Wave them down, skip the line with early-bird discounts, or start earning today with nothing upfront. Launching first in Modesto, CA.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'StreetServe',
    images: [{ url: marketingConfig.logoSrc, width: 1024, height: 1024, alt: 'StreetServe' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [marketingConfig.logoSrc],
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'StreetServe',
  description,
  slogan: 'See good, do good.',
  logo: marketingConfig.logoSrc,
  areaServed: marketingConfig.launchCity,
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.items.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection />
      <MetricsStrip />
      <HowItWorks />
      <FeatureGrid />
      <MapShowcase />
      <BenefitsTabs />
      <ImpactSection />
      <Testimonials />
      <TrustSection />
      <PartnersSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
