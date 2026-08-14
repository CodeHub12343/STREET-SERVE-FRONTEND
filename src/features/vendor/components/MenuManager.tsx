'use client';

/**
 * V-06 Menu Manager (docs/13 V-06) — CRUD items with an availability toggle and a Today's Special
 * flag. Edits are optimistic. The add form validates name + price (integer cents).
 *
 * "Sold out" (availability) and "Remove" are deliberately distinct: sold-out is today's state,
 * removal is permanent. Removal is confirmed because it is a hard delete server-side — safe for
 * receipts (orders snapshot name + price) but not undoable here.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Star, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { Modal } from '@/components/primitives/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import {
  useAddMenuItem,
  useDeleteMenuItem,
  useTodaysSpecial,
  useUpdateMenuItem,
  useVendorMenu,
} from '../hooks/useVendorMenu';
import { PhotoPicker } from './PhotoPicker';
import type { VendorMenuItem } from '../types';

export function MenuManager({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: items, isLoading } = useVendorMenu(businessId);
  const add = useAddMenuItem(businessId);
  const update = useUpdateMenuItem(businessId);
  const remove = useDeleteMenuItem(businessId);
  const { specialId, setSpecial } = useTodaysSpecial(businessId);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState<VendorMenuItem | null>(null);

  const submit = () => {
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim()) return setError('Enter an item name');
    if (!Number.isFinite(priceCents) || priceCents < 0) return setError('Enter a valid price');
    // The photo is deliberately not required — a vendor adding items one-handed mid-rush ships
    // the item now and can add the picture later.
    add.mutate(
      { name: name.trim(), priceCents, photoUrl },
      {
        onSuccess: () => {
          setName('');
          setPrice('');
          setPhotoUrl(undefined);
          setError(undefined);
        },
        onError: () => setError('Could not add the item. Please try again.'),
      },
    );
  };

  return (
    <Wrap>
      <AddCard>
        <AddRow>
          <PhotoPicker value={photoUrl} onChange={(url) => setPhotoUrl(url ?? undefined)} size={64} />
          <Fields>
            <Row>
              <Input aria-label="Item name" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
              <Input aria-label="Price" placeholder="0.00" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Row>
            <Hint>Photos are optional — items sell better with one, but you can add it later.</Hint>
          </Fields>
        </AddRow>
        <Button size="compact" loading={add.isPending} onClick={submit}>
          <Plus size={16} /> Add item
        </Button>
      </AddCard>

      {isLoading ? (
        <List><Skeleton $h="64px" $radius={16} /><Skeleton $h="64px" $radius={16} /></List>
      ) : (
        <List>
          {(items ?? []).map((item) => {
            const isSpecial = specialId === item.id;
            return (
            <Item key={item.id} $unavailable={!item.available}>
              <ItemMain>
                <PhotoPicker
                  value={item.photoUrl}
                  size={44}
                  label={`Add a photo for ${item.name}`}
                  onChange={(url) => update.mutate({ itemId: item.id, patch: { photoUrl: url } })}
                />
                <div>
                  <Name>
                    {item.name}
                    {isSpecial ? <SpecialTag><Star size={11} /> Special</SpecialTag> : null}
                  </Name>
                  <Price className="tnum">{item.priceCents === 0 ? 'Free' : formatCents(item.priceCents)}</Price>
                </div>
              </ItemMain>
              <Controls>
                <Chip selected={isSpecial} onClick={() => setSpecial.mutate(isSpecial ? null : item.id)}>
                  Special
                </Chip>
                <Chip selected={item.available} onClick={() => update.mutate({ itemId: item.id, patch: { available: !item.available } })}>
                  {item.available ? 'Available' : 'Sold out'}
                </Chip>
                <RemoveBtn aria-label={`Remove ${item.name}`} onClick={() => setConfirming(item)}>
                  <Trash2 size={15} />
                </RemoveBtn>
              </Controls>
            </Item>
            );
          })}
        </List>
      )}

      {confirming ? (
        <Modal open title="Remove this item?" onClose={() => setConfirming(null)}>
          <Confirm>
            <p>
              <b>{confirming.name}</b> will be removed from your menu for good. Past orders and
              receipts keep their details. If it’s only unavailable today, use <b>Sold out</b>
              instead.
            </p>
            <Button
              variant="destructive"
              fullWidth
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(confirming.id, {
                  onSuccess: () => {
                    setConfirming(null);
                    show('Item removed', 'default');
                  },
                  onError: () => show('Could not remove the item', 'danger'),
                })
              }
            >
              <Trash2 size={15} /> Remove item
            </Button>
            <Button variant="tertiary" fullWidth onClick={() => setConfirming(null)}>
              Keep it
            </Button>
          </Confirm>
        </Modal>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  width: 100%;
  max-width: 640px;
  min-width: 0;
`;
const AddCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const AddRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Fields = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
`;
const Row = styled.div`
  display: grid;
  /* minmax(0, …) lets the inputs shrink below their intrinsic width — a bare fr track's
     auto minimum would force the card (and the whole page) wider than a phone screen. */
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Hint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ItemMain = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  min-width: 0;
  flex: 1 1 auto;
  & > div {
    min-width: 0;
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div<{ $unavailable: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* narrow phones: the chip controls drop below the name instead of clipping */
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  opacity: ${({ $unavailable }) => ($unavailable ? 0.55 : 1)};
`;
const Name = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  min-width: 0;
  overflow-wrap: anywhere;
`;
const SpecialTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Price = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Controls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const RemoveBtn = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textTertiary};
  &:hover {
    color: ${({ theme }) => theme.color.statusDanger};
    border-color: ${({ theme }) => theme.color.statusDanger};
  }
`;
const Confirm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
