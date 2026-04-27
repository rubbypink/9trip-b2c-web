"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook lấy danh sách tour từ mock data (sẽ thay bằng Firebase sau).
 * @param {{ featured?: boolean, limit?: number }} options
 * @returns {{ tours: Array, loading: boolean, error: string | null }}
 */
export default function useTours({ featured = false, limit = 8 } = {}) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Mock data — sẽ thay bằng Firebase query sau khi Firestore được setup
    const mockTours = generateMockTours(limit, featured);

    // Simulate network delay
    const timer = setTimeout(() => {
      setTours(mockTours);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [featured, limit]);

  return { tours, loading, error };
}

/**
 * Tạo mock tours cho development.
 * @param {number} count
 * @param {boolean} featured
 * @returns {Array}
 */
function generateMockTours(count, featured) {
  const destinations = [
    { name: "Hạ Long", image: "https://images.unsplash.com/photo-1583417319070-4a6e6e09c5e3?w=600&q=80" },
    { name: "Đà Nẵng", image: "https://images.unsplash.com/photo-1559592413-7cec4c208663?w=600&q=80" },
    { name: "Hội An", image: "https://images.unsplash.com/photo-1559592413-7cec4c208663?w=600&q=80" },
    { name: "Nha Trang", image: "https://images.unsplash.com/photo-1524220247381-21aa9e1d207e?w=600&q=80" },
    { name: "Phú Quốc", image: "https://images.unsplash.com/photo-1599079448118-15e476387d03?w=600&q=80" },
    { name: "Đà Lạt", image: "https://images.unsplash.com/photo-1599407610352-cf9c5f3d1661?w=600&q=80" },
    { name: "Sapa", image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=600&q=80" },
    { name: "Huế", image: "https://images.unsplash.com/photo-1604916454112-0f7c94b0ff92?w=600&q=80" },
  ];

  const tourNames = [
    "Tour khám phá",
    "Tour nghỉ dưỡng",
    "Tour mạo hiểm",
    "Tour ẩm thực",
    "Tour văn hóa",
    "Tour biển đảo",
    "Tour trekking",
    "Tour city tour",
  ];

  return Array.from({ length: count }, (_, i) => {
    const dest = destinations[i % destinations.length];
    const nameIdx = i % tourNames.length;
    const price = Math.floor(Math.random() * 15 + 3) * 1000000;
    const rating = (Math.random() * 2 + 3).toFixed(1);

    return {
      id: `tour-${i + 1}`,
      slug: `tour-${dest.name.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`,
      name: `${tourNames[nameIdx]} ${dest.name}`,
      title: `${tourNames[nameIdx]} ${dest.name}`,
      locationName: dest.name,
      locationId: dest.name.toLowerCase(),
      media: [dest.image],
      pricing: {
        adultPrice: price,
        childPrice: Math.floor(price * 0.7),
        discount: featured ? Math.floor(Math.random() * 30 + 10) : 0,
      },
      ratingAverage: parseFloat(rating),
      reviewCount: Math.floor(Math.random() * 200 + 10),
      duration: ["2N1Đ", "3N2Đ", "4N3Đ", "5N4Đ"][Math.floor(Math.random() * 4)],
    };
  });
}