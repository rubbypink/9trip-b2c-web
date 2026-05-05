import { getFeaturedTours } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import FeaturedTours from "@/components/home/FeaturedTours";

/**
 * FeaturedToursServer — Server component hiển thị tour nổi bật.
 * Fetch dữ liệu trực tiếp từ Firestore.
 */
export default async function FeaturedToursServer() {
  let tours = [];
  try {
    const rawTours = await getFeaturedTours(8);
    tours = await resolveDocsImages(rawTours);
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!tours || tours.length === 0) return null;

  return <FeaturedTours tours={tours} />;
}