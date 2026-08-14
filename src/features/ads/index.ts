export { AdsDashboard } from './components/AdsDashboard';
export { PromoteFlow, type PromoteSubject } from './components/PromoteFlow';
export { AdSlot } from './components/AdSlot';
export { PromotedLabel } from './components/PromotedLabel';
export {
  useAdPricing,
  usePlacements,
  useCreateCampaign,
  useCreateFeatured,
  usePausePlacement,
  useServedAds,
  useRecordAdClick,
} from './hooks/useAds';
export type {
  AdPlacementSurface,
  AdPricing,
  Placement,
  PlacementStatus,
  ServedAd,
} from './types';
