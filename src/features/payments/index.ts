export { PaymentSheet, type PaymentSheetProps } from './components/PaymentSheet';

// ─── Digital rail (Phase 2): customer card payment for consignment stock ─────────────────────
export { CollectPayment } from './components/CollectPayment';
export { PayPage } from './components/PayPage';
export {
  useCreateSalePayment,
  useSalePaymentStatus,
  useCancelSalePayment,
  usePayPage,
} from './hooks/useSalePayment';
export type { SalePaymentIntent, SalePaymentStatus, PayPageView } from './types';
