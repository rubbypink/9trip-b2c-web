import { getFeaturedTours } from "@/lib/firestore";
import FeaturedTours from "@/components/home/FeaturedTours";

/**
 * FeaturedToursServer — Server component hiển thị tour nổi bật.
 * Fetch dữ liệu trực tiếp từ Firestore.
 */
export default async function FeaturedToursServer() {
  let tours = [];
  try {
    tours = await getFeaturedTours(8);
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!tours || tours.length === 0) return null;

  return <FeaturedTours tours={tours} />;
}