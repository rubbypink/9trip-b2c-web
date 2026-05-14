'use client';

import dynamic from 'next/dynamic';

const BackToTop = dynamic(() => import('@/components/shared/BackToTop'), {
  ssr: false,
  loading: () => null,
});

/**
 * BackToTopWrapper — Client Component that lazy-loads BackToTop.
 * Required because `ssr: false` is not allowed with next/dynamic in Server Components (Next.js 16).
 * @updated 2026-05-14
 */
export default function BackToTopWrapper() {
  return <BackToTop />;
}
