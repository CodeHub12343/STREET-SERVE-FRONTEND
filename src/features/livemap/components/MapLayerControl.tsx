'use client';

/**
 * C-4 — the layer switcher and legend.
 *
 * Once the map carries more than one kind of thing, two questions become unavoidable: *what am I
 * looking at* and *how do I turn that off*. This answers both in one control, because splitting a
 * legend from a filter means the legend gets ignored and the filter gets hunted for.
 *
 * Collapsed by default to a single button. The map is the product's primary surface and the pins
 * are the content; a permanent panel would spend scarce vertical space on chrome. Expanded, each
 * row shows its own swatch — so the panel IS the legend, rather than describing one.
 *
 * The demand row explains itself even when off, because "Demand" alone is ambiguous (demand for
 * what? mine or everyone's?) and an unexplained heat wash is the kind of feature people distrust.
 */
import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { Layers, X } from 'lucide-react';
import { useMapLayersStore, type MapLayerKey } from '@/stores/mapLayers.store';

interface LayerDef {
  key: MapLayerKey;
  label: string;
  hint: string;
  swatch: 'business' | 'hub' | 'demand' | 'event';
}

const LAYERS: LayerDef[] = [
  {
    key: 'businesses',
    label: 'Businesses',
    hint: 'Live vendors serving right now',
    swatch: 'business',
  },
  {
    key: 'hubs',
    label: 'Pickup hubs',
    hint: 'Where you can collect stock to sell',
    swatch: 'hub',
  },
  {
    key: 'demand',
    label: 'Demand',
    hint: 'Where people are waving and joining lines',
    swatch: 'demand',
  },
  {
    key: 'events',
    label: 'Events',
    hint: 'Fairs, markets and shows happening nearby',
    swatch: 'event',
  },
];

export function MapLayerControl() {
  const [open, setOpen] = useState(false);
  const layers = useMapLayersStore();
  const activeCount = LAYERS.filter((l) => layers[l.key]).length;
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Dismissal. Previously the ✕ was the only way out, which is wrong for a control that floats over
   * a map: the reflex is to tap the map to get back to it, and a panel that ignores that reads as
   * stuck. Escape and outside-press both close, and focus returns to the trigger so a keyboard user
   * is not dropped at the top of the document.
   */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent): void => {
      // Presses inside the anchor (trigger or panel) are the control's own business.
      if (anchorRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    // Capture phase: the map swallows pointer events on its own canvas, so a bubbling listener
    // would never see a tap on the map — the most likely way somebody dismisses this.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  /**
   * The trigger ALWAYS renders, and the panel floats out of flow beneath it.
   *
   * It used to be either/or in the same slot: a 40px pill swapped for a 260px panel, inline in the
   * map's top row. Opening it therefore re-laid-out the whole header — the search field collapsed
   * to a stub, the list button was shoved to the edge, and the category chips ended up underneath.
   * Anchoring the panel absolutely keeps the row's geometry identical whether it is open or shut.
   */
  return (
    <Anchor ref={anchorRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Map layers, ${activeCount} of ${LAYERS.length} on`}
      >
        <Layers size={18} aria-hidden />
        <TriggerCount className="tnum">{activeCount}</TriggerCount>
      </Trigger>

      {open ? (
        <Panel role="group" aria-label="Map layers">
          <PanelHead>
            <PanelTitle>Layers</PanelTitle>
            <Close
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close layers"
            >
              <X size={15} aria-hidden />
            </Close>
          </PanelHead>

          {LAYERS.map((l) => {
            const on = layers[l.key];
            return (
              <Row
                key={l.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => layers.toggle(l.key)}
              >
                <Swatch $kind={l.swatch} $on={on} aria-hidden />
                <RowText>
                  <RowLabel $on={on}>{l.label}</RowLabel>
                  <RowHint>{l.hint}</RowHint>
                </RowText>
                <Track $on={on} aria-hidden>
                  <Knob $on={on} />
                </Track>
              </Row>
            );
          })}
        </Panel>
      ) : null}
    </Anchor>
  );
}

/**
 * The positioning context for the popover. Sized by the trigger alone, so the top row's layout is
 * identical open or closed — which is the whole point of the fix.
 */
const Anchor = styled.div`
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
`;
const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  box-shadow: ${({ theme }) => theme.color.shadow};
  cursor: pointer;
`;
const TriggerCount = styled.span`
  font-size: 12px;
  font-weight: 800;
`;
const Panel = styled.div`
  /**
   * Floats out of flow, hung under the trigger and aligned to its right edge — so a 260px panel
   * opens leftward into the map rather than pushing the header around or running off-screen.
   */
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space[2]}px);
  right: 0;
  /* Above the map and the rest of the header chrome; still under the nav dock (900) and sheets. */
  z-index: 40;

  display: grid;
  gap: 2px;
  width: 260px;
  /* Never wider than the viewport on a small phone, minus the map's own gutters. */
  max-width: calc(100vw - 32px);
  padding: ${({ theme }) => theme.space[2]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;
const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[1]}px ${({ theme }) => theme.space[2]}px;
`;
const PanelTitle = styled.h2`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const Close = styled.button`
  display: inline-flex;
  padding: 4px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.textTertiary};
  cursor: pointer;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[2]}px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
/** The swatch is the legend — each matches the layer's real appearance on the map. */
const Swatch = styled.span<{ $kind: LayerDef['swatch']; $on: boolean }>`
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  opacity: ${({ $on }) => ($on ? 1 : 0.35)};
  ${({ theme, $kind }) => {
    if ($kind === 'business') {
      return css`
        border-radius: 50%;
        background: ${theme.color.surfaceBase};
        border: 3px solid ${theme.color.statusLive};
      `;
    }
    if ($kind === 'event') {
      return css`
        border-radius: 8px 8px 8px 2px;
        background: ${theme.color.accentPrimary};
      `;
    }
    if ($kind === 'hub') {
      return css`
        border-radius: 5px;
        background: ${theme.color.accentSecondary};
      `;
    }
    return css`
      border-radius: 50%;
      background: radial-gradient(
        circle,
        ${theme.color.accentPrimary} 0%,
        transparent 72%
      );
    `;
  }}
`;
const RowText = styled.span`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;
const RowLabel = styled.span<{ $on: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme, $on }) => ($on ? theme.color.textPrimary : theme.color.textTertiary)};
`;
const RowHint = styled.span`
  font-size: 11px;
  line-height: 1.35;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Track = styled.span<{ $on: boolean }>`
  flex: 0 0 auto;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  padding: 2px;
  background: ${({ theme, $on }) => ($on ? theme.color.statusLive : theme.color.line2)};
  transition: background 140ms ease;
`;
const Knob = styled.span<{ $on: boolean }>`
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transform: translateX(${({ $on }) => ($on ? '14px' : '0')});
  transition: transform 140ms ease;
`;
