'use client';

/**
 * Vendor postcard marketing.
 *
 * `postcards:order` is a permission distinct from the rest of the vendor surface (7.3, F-14):
 * this screen spends real money in one press, and a $500 mailing is a different kind of act from
 * editing a menu. The server enforces it too — this only avoids showing a door that will not open.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { PostcardOrderList, PostcardOrderWizard } from '@/features/postcards';
import { VendorBusinessGate } from '@/features/vendor';
import { Button } from '@/components/primitives/Button';
import { useRequireRole } from '@/lib/auth/guards';

export default function PostcardsPage() {
  useRequireRole('vendor');
  const [composing, setComposing] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>();

  return (
    <VendorBusinessGate>
      {(businessId) => (
        <Root>
          <Head>
            <div>
              <Title>Postcard marketing</Title>
              <Sub>Put a card through every door on the streets you work.</Sub>
            </div>
            {!composing ? (
              <Button
                onClick={() => {
                  setOrderId(undefined);
                  setComposing(true);
                }}
              >
                New mailing
              </Button>
            ) : (
              <Button variant="tertiary" onClick={() => setComposing(false)}>
                Back to orders
              </Button>
            )}
          </Head>

          {composing ? (
            <PostcardOrderWizard
              businessId={businessId}
              orderId={orderId}
              onOrderCreated={setOrderId}
            />
          ) : (
            <PostcardOrderList
              businessId={businessId}
              onOpenOrder={(id) => {
                setOrderId(id);
                setComposing(true);
              }}
            />
          )}
        </Root>
      )}
    </VendorBusinessGate>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const Head = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[4]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Sub = styled.p`
  margin: 2px 0 0;
  color: ${({ theme }) => theme.color.textSecondary};
`;
