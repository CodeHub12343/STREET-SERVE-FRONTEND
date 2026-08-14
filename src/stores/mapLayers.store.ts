'use client';

/**
 * C-4 — which map layers are on.
 *
 * Persisted, because a layer choice is a working preference: a seller who turns on hubs and turns
 * off businesses is telling us what they use the map FOR, and re-asking every session is a small
 * insult. Persisted per-device rather than per-account so a shared phone doesn't leak one person's
 * working mode to the next.
 *
 * Defaults are deliberate rather than "everything on":
 *  • `businesses` — on. It is what the map has always been and what a customer opens it for.
 *  • `hubs` — on. This is the Phase C headline; hiding the supply side behind a toggle nobody finds
 *    would reproduce exactly the problem C-1 exists to fix.
 *  • `demand` — OFF. It is a vendor's planning tool, and an ambient heat wash under every customer's
 *    map would degrade the primary use case to decorate a secondary one.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapLayerKey = 'businesses' | 'hubs' | 'demand' | 'events';

interface MapLayersState {
  businesses: boolean;
  hubs: boolean;
  demand: boolean;
  /** E-4: deferred at C-4 because no event entity existed. It does now. */
  events: boolean;
  toggle: (key: MapLayerKey) => void;
  set: (key: MapLayerKey, on: boolean) => void;
}

export const useMapLayersStore = create<MapLayersState>()(
  persist(
    (set) => ({
      businesses: true,
      hubs: true,
      demand: false,
      // ON by default, unlike demand: an event near you is directly actionable for a customer
      // AND a seller, where a demand heat wash only means something to a vendor planning a route.
      events: true,
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Pick<MapLayersState, MapLayerKey>),
      set: (key, on) => set(() => ({ [key]: on }) as Pick<MapLayersState, MapLayerKey>),
    }),
    {
      name: 'ss.map-layers',
      // Only the booleans — never the actions, which would serialise as null and break rehydration.
      partialize: (s) => ({
        businesses: s.businesses,
        hubs: s.hubs,
        demand: s.demand,
        events: s.events,
      }),
    },
  ),
);
