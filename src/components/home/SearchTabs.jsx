import SearchTabsClient from "./SearchTabsClient";

/**
 * SearchTabs — Server component wrapper. Re-exports SearchTabsClient.
 * Tách riêng để giữ HeroBanner là Server Component, chỉ Client Component bên trong.
 */
export default function SearchTabs() {
  return <SearchTabsClient />;
}