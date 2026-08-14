import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { MapLayerControl } from './components/MapLayerControl';

/**
 * C-4 layer switcher — a regression guard for a layout bug, not a feature test.
 *
 * The control used to render EITHER a 40px trigger pill OR a 260px panel in the same inline slot of
 * the map's top row. Opening it therefore re-laid-out the whole header: the search field collapsed
 * to a stub, the list button was shoved to the screen edge, and the category chips ended up
 * underneath the panel.
 *
 * The fix is that the trigger always stays mounted and the panel is absolutely positioned beneath
 * it. That is invisible to a snapshot and easy to undo by accident, so the invariant is pinned
 * here: **the trigger is still in the document while the panel is open.**
 *
 * Dismissal is covered too, because a panel floating over a map with no way out but a single ✕ is
 * the other half of what made this feel broken.
 */

function wrap(ui: ReactNode) {
  return <ThemeProvider theme={darkTheme}>{ui}</ThemeProvider>;
}

const trigger = () => screen.getByRole('button', { name: /map layers/i });
const panel = () => screen.queryByRole('group', { name: /map layers/i });

describe('MapLayerControl', () => {
  it('keeps the trigger mounted when the panel opens, so the header never reflows', async () => {
    const user = userEvent.setup();
    render(wrap(<MapLayerControl />));

    expect(panel()).not.toBeInTheDocument();
    await user.click(trigger());

    expect(panel()).toBeInTheDocument();
    // The invariant. If the trigger disappears, the panel has taken its slot in the row again and
    // the original layout bug is back.
    expect(trigger()).toBeInTheDocument();
  });

  it('reports its state through aria-expanded', async () => {
    const user = userEvent.setup();
    render(wrap(<MapLayerControl />));

    // Previously unreportable: the trigger unmounted on open, so it could never say `true`.
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const user = userEvent.setup();
    render(wrap(<MapLayerControl />));

    await user.click(trigger());
    expect(panel()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(panel()).not.toBeInTheDocument();
    // Without this a keyboard user is dropped at the top of the document on dismiss.
    expect(trigger()).toHaveFocus();
  });

  it('closes when something outside it is pressed', async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <>
          <MapLayerControl />
          <div data-testid="map-surface" style={{ width: 200, height: 200 }} />
        </>,
      ),
    );

    await user.click(trigger());
    expect(panel()).toBeInTheDocument();

    // Tapping the map is the reflex way out of a panel floating over it.
    await user.click(screen.getByTestId('map-surface'));
    expect(panel()).not.toBeInTheDocument();
  });

  it('stays open while layers inside it are toggled', async () => {
    const user = userEvent.setup();
    render(wrap(<MapLayerControl />));
    await user.click(trigger());

    const demand = screen.getByRole('switch', { name: /demand/i });
    await user.click(demand);

    // A press inside the panel must not be mistaken for an outside press — otherwise turning a
    // layer on would slam the panel shut and you could only ever change one thing at a time.
    expect(panel()).toBeInTheDocument();
  });

  it('describes the demand layer even when it is off', async () => {
    const user = userEvent.setup();
    render(wrap(<MapLayerControl />));
    await user.click(trigger());

    // The component's own docblock: an unexplained heat wash is a feature people distrust.
    expect(screen.getByText(/where people are waving and joining lines/i)).toBeInTheDocument();
  });
});
