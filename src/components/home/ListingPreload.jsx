'use client';

import { useEffect } from 'react';
import useListingStore from '@/stores/listing-store';

/**
 * Reads server-embedded page-1 listing data from a hidden script tag
 * and hydrates the client-side zustand cache.
 * After hydration, triggers router.prefetch for page 2 of each type
 * so the next navigation is instant.
 */
export default function ListingPreload() {
  useEffect(() => {
    const el = document.getElementById('listing-preload-data');
    if (!el) return;

    try {
      const raw = el.textContent;
      if (!raw) return;
      const data = JSON.parse(raw);
      const store = useListingStore.getState();

      if (data.tours && data.tours.items?.length > 0) {
        store.setPageData('tour:default:p1', data.tours);
      }
      if (data.hotels && data.hotels.items?.length > 0) {
        store.setPageData('hotel:default:p1', data.hotels);
      }
      if (data.activities && data.activities.items?.length > 0) {
        store.setPageData('activity:default:p1', data.activities);
      }
    } catch {
      // silently fail — data will be fetched normally by the listing page
    }
  }, []);

  return null;
}
