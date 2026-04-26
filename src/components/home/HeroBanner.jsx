/**
 * HeroBanner - Khu vực banner chính trang chủ với form tìm kiếm.
 */
"use client";

import { useState } from "react";
import SearchTabs from "./SearchTabs";

export default function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Khám phá Việt Nam <br className="hidden md:block" />
            theo cách của bạn
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
            Hàng nghìn tour du lịch, khách sạn, và trải nghiệm đang chờ bạn. Đặt ngay hôm nay với giá tốt nhất.
          </p>
        </div>

        {/* Search Tabs */}
        <SearchTabs />
      </div>
    </section>
  );
}