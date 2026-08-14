import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Radio, Receipt, Hand } from 'lucide-react';
import { renderWithTheme } from '@/test/test-utils';
import { OrbitNav, OrbitDockButton } from './OrbitNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vendor',
}));

const LIVE_ITEM = { href: '/vendor', label: 'Live Status', icon: <Radio size={18} /> };
const ITEMS = [
  LIVE_ITEM,
  { href: '/vendor/wave-downs', label: 'Wave-downs', icon: <Hand size={18} />, badge: 3 },
  { href: '/vendor/orders', label: 'Orders', icon: <Receipt size={18} />, badge: 2 },
];

describe('OrbitNav', () => {
  it('opens the orbit, marks the active route, and closes on Escape', () => {
    renderWithTheme(<OrbitNav items={ITEMS} />);

    // Closed: just the orb, with the aggregate badge folded into its label.
    const orb = screen.getByRole('button', { name: 'Open navigation, 5 new' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(orb);
    const dialog = screen.getByRole('dialog', { name: 'Dashboard navigation' });
    expect(dialog).toBeTruthy();

    // Every item is a real link; the current route carries aria-current.
    const live = screen.getByRole('link', { name: /Live Status/ });
    expect(live.getAttribute('href')).toBe('/vendor');
    expect(live.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Wave-downs.*3 new/ })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Open navigation/ })).toBeTruthy();
  });

  it('shows no badge when counts are absent', () => {
    renderWithTheme(<OrbitNav items={[LIVE_ITEM]} />);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeTruthy();
  });

  it('renders dock buttons around the closed orb and hides them while open', () => {
    renderWithTheme(
      <OrbitNav
        items={[LIVE_ITEM]}
        left={<OrbitDockButton href="/vendor/wave-downs" label="Wave-downs" icon={<Hand size={18} />} badge={2} />}
        right={<OrbitDockButton href="/vendor/orders" label="Orders" icon={<Receipt size={18} />} />}
      />,
    );
    const waves = screen.getByRole('link', { name: 'Wave-downs, 2 new' });
    expect(waves.getAttribute('href')).toBe('/vendor/wave-downs');
    expect(screen.getByRole('link', { name: 'Orders' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    // Dock is replaced by the orbit; its shortcuts are gone until it closes.
    expect(screen.queryByRole('link', { name: 'Wave-downs, 2 new' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Dashboard navigation' })).toBeTruthy();
  });
});

/**
 * A circle holds a fixed number of labels, and the vendor menu outgrew it — sixteen items were laid
 * out as two concentric rings and collided into something unreadable. One ring is the rule now, so
 * anything past its capacity has to page rather than crowd in.
 */
describe('OrbitNav overflow', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      href: `/vendor/p${i}`,
      label: `Page ${i}`,
      icon: <Receipt size={18} />,
    }));

  it('shows every item on one ring when it fits, with no More control', () => {
    renderWithTheme(<OrbitNav items={many(8)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /More destinations/ })).toBeNull();
  });

  it('pages the overflow instead of crowding the ring', () => {
    // 16 items — the count that produced the unreadable two-ring layout.
    renderWithTheme(<OrbitNav items={many(16)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    // Seven destinations plus a More control: never more than eight nodes on the circle.
    expect(screen.getAllByRole('link')).toHaveLength(7);
    const more = screen.getByRole('button', { name: 'More destinations, page 1 of 3' });

    expect(screen.getByRole('link', { name: /Page 0/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Page 7/ })).toBeNull();

    fireEvent.click(more);
    expect(screen.getByRole('link', { name: /Page 7/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Page 0/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'More destinations, page 2 of 3' })).toBeTruthy();
  });

  it('wraps from the last page back to the first', () => {
    renderWithTheme(<OrbitNav items={many(16)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    fireEvent.click(screen.getByRole('button', { name: /page 1 of 3/ }));
    fireEvent.click(screen.getByRole('button', { name: /page 2 of 3/ }));
    fireEvent.click(screen.getByRole('button', { name: /page 3 of 3/ }));

    expect(screen.getByRole('link', { name: /Page 0/ })).toBeTruthy();
  });

  it('carries unread counts from pages you cannot see onto the More control', () => {
    // Otherwise paging would bury a notification — the badge is the only clue it is back there.
    const items = many(16).map((it, i) => (i === 12 ? { ...it, badge: 4 } : it));
    renderWithTheme(<OrbitNav items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /Open navigation, 4 new/ }));

    expect(screen.getByRole('button', { name: 'More destinations, page 1 of 3, 4 new' })).toBeTruthy();
  });

  it('reopens on the first page rather than resuming mid-set', () => {
    renderWithTheme(<OrbitNav items={many(16)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getByRole('button', { name: /page 1 of 3/ }));
    expect(screen.getByRole('link', { name: /Page 7/ })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('link', { name: /Page 0/ })).toBeTruthy();
  });
});
