'use client';

/**
 * H-02 Product Catalog Manager (docs/13 H-02) — list consignment products with quantities + terms,
 * and add new listings. Edits are optimistic. The terms panel covers the owner-authored consignment
 * terms (R14/R17/R18): term length, minimum authorized price, seller permissions, and who is
 * responsible for returning unsold stock.
 */
import { useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { ChevronDown, Megaphone, Plus } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Button } from '@/components/primitives/Button';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Switch } from '@/components/primitives/Switch';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { useCreateHubProduct, useHubProducts } from '../hooks/useHub';
import { ProductPhotos } from './ProductPhotos';

const CATS = [
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Goods' },
  { value: 'services', label: 'Services' },
];

// Mirrors backend CONSIGNMENT_TERM_DAYS + the open-ended `no_limit` term (R14).
const TERMS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '365 days' },
  { value: 'no_limit', label: 'No limit' },
];

export function HubProducts({ hubId }: { hubId: string }) {
  const { data: products, isLoading } = useHubProducts(hubId);
  const create = useCreateHubProduct(hubId);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('shopping');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  // ── Consignment terms (collapsed by default; backend defaults apply untouched) ──
  const [showTerms, setShowTerms] = useState(false);
  const [termDays, setTermDays] = useState('30');
  const [split, setSplit] = useState('65');
  const [returnDays, setReturnDays] = useState('14');
  const [minPrice, setMinPrice] = useState('');
  const [returnResp, setReturnResp] = useState<'seller' | 'hub'>('seller');
  const [mayDiscount, setMayDiscount] = useState(true);
  const [mayBundle, setMayBundle] = useState(true);
  const [mayAcceptOffers, setMayAcceptOffers] = useState(true);
  const [maySellBelowMin, setMaySellBelowMin] = useState(false);

  const submit = () => {
    const quantityTotal = parseInt(qty, 10);
    const unitPriceCents = Math.round(parseFloat(price) * 100);
    const sellerSplitPercent = parseInt(split, 10);
    const returnWindowDays = parseInt(returnDays, 10);
    const minimumAuthorizedPriceCents = minPrice.trim() ? Math.round(parseFloat(minPrice) * 100) : undefined;
    if (!name.trim()) return setError('Enter a product name');
    if (!Number.isFinite(quantityTotal) || quantityTotal <= 0) return setError('Enter a quantity');
    if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) return setError('Enter a unit price');
    if (!Number.isFinite(sellerSplitPercent) || sellerSplitPercent < 0 || sellerSplitPercent > 100) return setError('Seller split must be 0–100%');
    if (!Number.isFinite(returnWindowDays) || returnWindowDays < 1 || returnWindowDays > 30) return setError('Return window must be 1–30 days');
    if (minimumAuthorizedPriceCents !== undefined && (!Number.isFinite(minimumAuthorizedPriceCents) || minimumAuthorizedPriceCents < 0)) return setError('Enter a valid minimum price');
    setError(undefined);
    create.mutate(
      {
        name: name.trim(),
        category,
        quantityTotal,
        unitPriceCents,
        sellerSplitPercent,
        returnWindowDays,
        photos,
        termDays: termDays === 'no_limit' ? 'no_limit' : parseInt(termDays, 10),
        minimumAuthorizedPriceCents,
        returnResponsibility: returnResp,
        sellerPermissions: {
          may_discount: mayDiscount,
          may_bundle: mayBundle,
          may_accept_offers: mayAcceptOffers,
          may_sell_below_min: maySellBelowMin,
        },
      },
      { onSuccess: () => { setName(''); setQty(''); setPrice(''); setMinPrice(''); setPhotos([]); } },
    );
  };

  return (
    <Wrap>
      <AddCard>
        <Grid>
          <Input aria-label="Product name" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
          <Select aria-label="Category" options={CATS} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input aria-label="Quantity" placeholder="Qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input aria-label="Unit price" placeholder="Unit $" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Grid>

        <ProductPhotos value={photos} onChange={setPhotos} />

        <TermsToggle type="button" aria-expanded={showTerms} onClick={() => setShowTerms((s) => !s)}>
          <ChevronDown size={16} aria-hidden style={{ transform: showTerms ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          Consignment terms — {termDays === 'no_limit' ? 'no time limit' : `${termDays}-day term`}, {split}% seller split
        </TermsToggle>

        {showTerms && (
          <TermsPanel>
            <TermsGrid>
              <Select aria-label="Consignment term" label="Term" options={TERMS} value={termDays} onChange={(e) => setTermDays(e.target.value)} />
              <Input aria-label="Seller split percent" label="Seller split %" inputMode="numeric" value={split} onChange={(e) => setSplit(e.target.value)} />
              <Input aria-label="Return window days" label="Return window (days)" inputMode="numeric" value={returnDays} onChange={(e) => setReturnDays(e.target.value)} />
              <Input aria-label="Minimum authorized price" label="Min. price $ (optional)" inputMode="decimal" placeholder="No minimum" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </TermsGrid>

            <FieldLabel id="return-resp-label">Unsold stock is returned by</FieldLabel>
            <SegmentedControl
              ariaLabel="Return responsibility"
              segments={[
                { value: 'seller', label: 'Seller' },
                { value: 'hub', label: 'Hub picks up' },
              ]}
              value={returnResp}
              onChange={setReturnResp}
            />

            <FieldLabel as="span">Sellers may…</FieldLabel>
            <Perms>
              <PermRow><span>Offer discounts</span><Switch label="Sellers may offer discounts" checked={mayDiscount} onChange={setMayDiscount} /></PermRow>
              <PermRow><span>Bundle with other items</span><Switch label="Sellers may bundle" checked={mayBundle} onChange={setMayBundle} /></PermRow>
              <PermRow><span>Accept buyer offers</span><Switch label="Sellers may accept offers" checked={mayAcceptOffers} onChange={setMayAcceptOffers} /></PermRow>
              <PermRow><span>Sell below the minimum price</span><Switch label="Sellers may sell below minimum" checked={maySellBelowMin} onChange={setMaySellBelowMin} /></PermRow>
            </Perms>
          </TermsPanel>
        )}

        <Button size="compact" loading={create.isPending} onClick={submit}><Plus size={16} /> Add product</Button>
      </AddCard>

      {isLoading ? (
        <Skeleton $h="160px" $radius={16} />
      ) : (
        <Table>
          <thead>
            <tr><Th>Product</Th><Th>In / Out</Th><Th>Split</Th><Th>Unit</Th><Th /></tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id}>
                <Td>
                  <NameCell>
                    {p.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <Cover src={p.photos[0]} alt="" />
                    ) : null}
                    <span><b>{p.name}</b><small>{p.category}</small></span>
                  </NameCell>
                </Td>
                <Td className="tnum">{p.quantityTotal - p.quantityOut} / {p.quantityOut}</Td>
                <Td className="tnum">{p.sellerSplitPercent}%</Td>
                <Td className="tnum">{formatCents(p.unitPriceCents)}</Td>
                <Td>
                  {/* RV-11 — the entry point featured placement never had. Buying a boost for a
                      product belongs next to the product, not in a separate ads section the hub
                      owner has no reason to visit. */}
                  <PromoteLink
                    href={`/vendor/ads/new?kind=featured_product&subjectId=${p.id}&name=${encodeURIComponent(p.name)}`}
                  >
                    <Megaphone size={13} aria-hidden /> Promote
                  </PromoteLink>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Wrap>
  );
}

const PromoteLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.accentSecondary};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 800px;
`;
const AddCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]}px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`;
const TermsToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  border: 0;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
  justify-self: start;
`;
const TermsPanel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px dashed ${({ theme }) => theme.color.line2};
`;
const TermsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Cover = styled.img`
  width: 36px;
  height: 36px;
  flex: none;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Perms = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const PermRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
`;
const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const Td = styled.td`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  font-size: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  b {
    display: block;
    font-weight: 600;
  }
  small {
    color: ${({ theme }) => theme.color.textTertiary};
    font-size: 12px;
  }
`;
