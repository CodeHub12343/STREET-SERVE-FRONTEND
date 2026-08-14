'use client';

/**
 * WizardFlow template (docs/12 §1) — step indicator + single-focus step content + primary CTA,
 * with back always available. Used by onboarding, verification, vendor/hub registration, QR
 * checkout, gift/Spot Me. Progress persistence is the caller's concern (URL/Zustand).
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from '@/components/primitives/IconButton';

export interface WizardFlowProps {
  /** Total steps + the current 1-based step, for the indicator. */
  totalSteps: number;
  currentStep: number;
  title?: string;
  onBack?: () => void;
  /** Sticky footer, typically the primary CTA. */
  footer?: ReactNode;
  children: ReactNode;
}

export function WizardFlow({
  totalSteps,
  currentStep,
  title,
  onBack,
  footer,
  children,
}: WizardFlowProps) {
  return (
    <Root>
      <Header>
        {onBack ? (
          <IconButton label="Back" icon={<ArrowLeft size={20} />} onClick={onBack} />
        ) : (
          <span style={{ width: 40 }} />
        )}
        <Progress
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStep}
          aria-label={`Step ${currentStep} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, i) => (
            <Seg key={i} $done={i < currentStep} />
          ))}
        </Progress>
        <span style={{ width: 40 }} />
      </Header>
      <Content>
        {title ? <StepTitle>{title}</StepTitle> : null}
        {children}
      </Content>
      {footer ? <Footer>{footer}</Footer> : null}
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[4]}px 0;
`;
const Progress = styled.div`
  flex: 1;
  display: flex;
  gap: 4px;
`;
const Seg = styled.span<{ $done: boolean }>`
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme, $done }) => ($done ? theme.color.accentPrimary : theme.color.line2)};
  transition: background ${({ theme }) => theme.motion.standard}ms;
`;
const Content = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.space[5]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  align-content: start;
`;
const StepTitle = styled.h1`
  font-size: 26px;
  letter-spacing: -0.02em;
`;
const Footer = styled.footer`
  position: sticky;
  bottom: 0;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px
    calc(${({ theme }) => theme.space[4]}px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.color.surfaceBase};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
