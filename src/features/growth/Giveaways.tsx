'use client';

/**
 * V-10 Giveaways manager (docs/12 §4, FR-6.2) — item, daily cap, claimed count (no payment). Create
 * and toggle giveaways.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Gift, Plus } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Switch } from '@/components/primitives/Switch';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { isMapDemo } from '@/lib/env';
import { demoGiveaways, type DemoGiveaway } from '@/lib/demo';

export function Giveaways() {
  const { show } = useToast();
  const { data, isLoading } = useQuery<DemoGiveaway[]>({
    queryKey: ['giveaways'],
    queryFn: () => (isMapDemo ? Promise.resolve(demoGiveaways()) : Promise.resolve(demoGiveaways())),
    staleTime: Infinity,
  });
  const [items, setItems] = useState<DemoGiveaway[]>([]);
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');

  const list = items.length > 0 ? items : (data ?? []);

  const add = () => {
    const dailyCap = parseInt(cap, 10);
    if (!name.trim() || !Number.isFinite(dailyCap)) return;
    setItems([{ id: `gv_${Date.now()}`, item: name.trim(), dailyCap, claimedToday: 0, active: true }, ...list]);
    setName('');
    setCap('');
    show('Giveaway created', 'success');
  };

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;

  return (
    <Wrap>
      <AddCard>
        <Row>
          <Input aria-label="Item" placeholder="Free item" value={name} onChange={(e) => setName(e.target.value)} />
          <Input aria-label="Daily cap" placeholder="Cap/day" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
        </Row>
        <Button size="compact" onClick={add}><Plus size={16} /> Add giveaway</Button>
      </AddCard>

      {list.map((g) => (
        <Card key={g.id}>
          <Icon aria-hidden><Gift size={18} /></Icon>
          <Info>
            <Name>{g.item}</Name>
            <Meta className="tnum">{g.claimedToday}/{g.dailyCap} claimed today</Meta>
          </Info>
          <Switch label="Active" checked={g.active} onChange={() => setItems((prev) => (prev.length ? prev : list).map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)))} />
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const AddCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 14%, transparent)`};
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const Info = styled.div`
  flex: 1;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Meta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
