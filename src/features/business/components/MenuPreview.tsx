'use client';

/**
 * C-14 menu preview — Today's Special pinned + a few items. Ordering (C-15/C-21) arrives in
 * Milestone 4; this is the read-only preview inside the profile sheet.
 */
import styled from 'styled-components';
import { Star } from 'lucide-react';
import { formatCents } from '@/lib/money';
import type { MenuItem } from '../types';

export function MenuPreview({ items }: { items: MenuItem[] }) {
  if (items.length === 0) return <Empty>Menu coming soon</Empty>;
  const preview = items.slice(0, 3);
  return (
    <List>
      {preview.map((item) => (
        <Item key={item.id}>
          <Main>
            {/* Photos are optional, so the row must look deliberate without one. */}
            {item.photoUrl ? <Thumb src={item.photoUrl} alt="" loading="lazy" /> : null}
            <Name>
              {item.name}
              {item.todaysSpecial ? (
                <Special>
                  <Star size={11} /> Today’s Special
                </Special>
              ) : null}
            </Name>
          </Main>
          <Price className="tnum">{item.priceCents === 0 ? 'Free' : formatCents(item.priceCents)}</Price>
        </Item>
      ))}
    </List>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Main = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  min-width: 0;
`;
const Thumb = styled.img`
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  object-fit: cover;
  background: ${({ theme }) => theme.color.surfaceRaised};
`;
const Name = styled.p`
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;
const Special = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  /* Same-hue mix toward text color for WCAG AA. */
  color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusWarning} 55%, ${theme.color.textPrimary})`};
`;
const Price = styled.span`
  font-weight: 800;
  font-size: 14px;
`;
const Empty = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
