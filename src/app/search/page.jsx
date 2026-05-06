import { redirect } from 'next/navigation';

/**
 * SearchPage — Disables the search page by redirecting to the home page.
 * This feature is currently under development.
 */
export default function SearchPage() {
  redirect('/');
}
