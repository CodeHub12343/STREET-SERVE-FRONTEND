import type { Metadata } from 'next';
import { AiAssistant } from '@/features/ai';

export const metadata: Metadata = { title: 'AI Assistant' };

export default function SellerAiPage() {
  return <AiAssistant />;
}
