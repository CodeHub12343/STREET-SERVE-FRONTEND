'use client';

/**
 * V-07 Services manager (BP-4). `GET/POST /businesses/:id/services` existed from the start with no
 * UI whatsoever — so every appointment and on-demand business was unable to manage the one thing
 * it sells. This is that screen.
 *
 * Deleting is a soft retire server-side (bookings reference services without a name snapshot), so
 * the copy says "Remove" and never promises erasure of past appointments.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Clock, Pencil, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { PhotoPicker } from './PhotoPicker';
import { Modal } from '@/components/primitives/Modal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import {
  useCreateService,
  useDeleteService,
  useUpdateService,
  useVendorServices,
  type VendorService,
} from '../hooks/useVendorServices';

interface Draft {
  id?: string;
  name: string;
  price: string;
  duration: string;
  photoUrl?: string | null;
}

const EMPTY: Draft = { name: '', price: '', duration: '30', photoUrl: null };

const toCents = (v: string): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export function ServicesManager({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: services, isLoading } = useVendorServices(businessId);
  const create = useCreateService(businessId);
  const update = useUpdateService(businessId);
  const remove = useDeleteService(businessId);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<VendorService | null>(null);
  const [error, setError] = useState<string>();

  const openNew = () => {
    setError(undefined);
    setDraft({ ...EMPTY });
  };
  const openEdit = (s: VendorService) => {
    setError(undefined);
    setDraft({
      id: s.id,
      name: s.name,
      price: (s.priceCents / 100).toFixed(2),
      duration: String(s.durationMin),
      photoUrl: s.photoUrl ?? null,
    });
  };

  const save = () => {
    if (!draft) return;
    const priceCents = toCents(draft.price);
    const durationMin = Number(draft.duration);
    if (!draft.name.trim()) return setError('Give the service a name');
    if (priceCents === null) return setError('Enter a price');
    if (!Number.isFinite(durationMin) || durationMin < 5) return setError('Enter how long it takes');

    // On edit send the photo even when cleared (null removes it); on create only when set.
    const payload = {
      name: draft.name.trim(),
      priceCents,
      durationMin,
      ...(draft.id ? { photoUrl: draft.photoUrl ?? null } : draft.photoUrl ? { photoUrl: draft.photoUrl } : {}),
    };
    const done = () => {
      setDraft(null);
      show(draft.id ? 'Service updated' : 'Service added', 'success');
    };
    const fail = () => show('Could not save the service', 'danger');

    if (draft.id) {
      update.mutate({ id: draft.id, ...payload }, { onSuccess: done, onError: fail });
    } else {
      create.mutate(payload, { onSuccess: done, onError: fail });
    }
  };

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="72px" $radius={16} />
        <Skeleton $h="72px" $radius={16} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Head>
        <Titles>
          <h1>Services</h1>
          <Sub>What customers book you for. These appear on your public profile.</Sub>
        </Titles>
        <AddButton size="compact" onClick={openNew}>
          <Plus size={15} /> Add service
        </AddButton>
      </Head>

      {(services?.length ?? 0) === 0 ? (
        <EmptyState
          icon="🛠️"
          title="No services yet"
          description="Add what you do, how long it takes, and what it costs. Customers can’t book you until there’s at least one."
          action={<Button onClick={openNew}>Add your first service</Button>}
        />
      ) : (
        <List>
          {services!.map((s) => (
            <Item key={s.id}>
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Thumb src={s.photoUrl} alt="" />
              ) : null}
              <ItemMain>
                <ItemName>{s.name}</ItemName>
                <ItemMeta>
                  <Clock size={12} aria-hidden /> {s.durationMin} min
                </ItemMeta>
              </ItemMain>
              <Price className="tnum">{formatCents(s.priceCents)}</Price>
              <Actions>
                <IconBtn aria-label={`Edit ${s.name}`} onClick={() => openEdit(s)}>
                  <Pencil size={15} />
                </IconBtn>
                <IconBtn
                  aria-label={`Remove ${s.name}`}
                  $danger
                  onClick={() => setConfirming(s)}
                >
                  <Trash2 size={15} />
                </IconBtn>
              </Actions>
            </Item>
          ))}
        </List>
      )}

      {draft ? (
        <Modal open title={draft.id ? 'Edit service' : 'Add a service'} onClose={() => setDraft(null)}>
          <Form>
            <PhotoRow>
              <PhotoPicker
                value={draft.photoUrl ?? undefined}
                onChange={(url) => setDraft({ ...draft, photoUrl: url })}
                size={72}
                label="Add a photo"
              />
              <PhotoHint>A photo of your work. Optional.</PhotoHint>
            </PhotoRow>
            <Input
              label="Service name"
              placeholder="Men’s haircut"
              required
              value={draft.name}
              error={error}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Row>
              <Input
                label="Price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="25.00"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
              <Input
                label="Duration"
                type="number"
                inputMode="numeric"
                min="5"
                step="5"
                hint="Minutes"
                value={draft.duration}
                onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              />
            </Row>
            <Button fullWidth loading={create.isPending || update.isPending} onClick={save}>
              {draft.id ? 'Save changes' : 'Add service'}
            </Button>
          </Form>
        </Modal>
      ) : null}

      {confirming ? (
        <Modal open title="Remove this service?" onClose={() => setConfirming(null)}>
          <Confirm>
            <p>
              <b>{confirming.name}</b> will stop appearing on your profile and customers won’t be
              able to book it. Appointments already booked are not affected.
            </p>
            <Button
              variant="destructive"
              fullWidth
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(confirming.id, {
                  onSuccess: () => {
                    setConfirming(null);
                    show('Service removed', 'default');
                  },
                  onError: () => show('Could not remove the service', 'danger'),
                })
              }
            >
              <Trash2 size={15} /> Remove service
            </Button>
            <Button variant="tertiary" fullWidth onClick={() => setConfirming(null)}>
              <X size={15} /> Keep it
            </Button>
          </Confirm>
        </Modal>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  /* Wrap the button below the title when the row can't fit both (narrow screens). */
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]}px;
  h1 {
    font-size: 22px;
  }
`;
const Titles = styled.div`
  flex: 1 1 200px;
  min-width: 0;
`;
const AddButton = styled(Button)`
  flex: 0 0 auto;
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const List = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Thumb = styled.img`
  width: 48px;
  height: 48px;
  flex: none;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const ItemMain = styled.div`
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const ItemName = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const ItemMeta = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Price = styled.p`
  flex: none;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 800;
`;
const Actions = styled.div`
  display: flex;
  flex: none;
  gap: 4px;
`;
const IconBtn = styled.button<{ $danger?: boolean }>`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme, $danger }) => ($danger ? theme.color.statusDanger : theme.color.textSecondary)};
  &:hover {
    color: ${({ theme, $danger }) => ($danger ? theme.color.statusDanger : theme.color.textPrimary)};
  }
`;
const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PhotoHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Confirm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
