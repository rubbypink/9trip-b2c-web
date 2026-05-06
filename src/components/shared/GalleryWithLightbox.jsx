/**
 * GalleryWithLightbox - Bộ sưu tập ảnh với lightbox xem ảnh lớn.
 * @param {{ images: string[], className?: string }} props
 */
"use client";

import { useState } from "react";
import Image from "next/image";

export default function GalleryWithLightbox({ images = [], className = "" }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center h-64 ${className}`}>
        <span className="text-muted-foreground">Chưa có ảnh</span>
      </div>
    );
  }

  const prev = () => setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
  const next = () => setSelectedIndex((selectedIndex + 1) % images.length);

  return (
    <div className={className}>
      {/* Grid gallery */}
      <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-4"} rounded-lg overflow-hidden`}>
        <div className={images.length > 1 ? "col-span-2 row-span-2" : ""}>
          <div
            className="relative w-full h-64 md:h-96 cursor-pointer group"
            onClick={() => setSelectedIndex(0)}
          >
            <Image src={images[0]} alt="Gallery image 1" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        </div>
        {images.slice(1, 5).map((img, idx) => (
          <div
            key={idx}
            className="relative w-full h-[calc((16rem-0.5rem)/2)] md:h-[calc((24rem-0.5rem)/2)] cursor-pointer group"
            onClick={() => setSelectedIndex(idx + 1)}
          >
            <Image src={img} alt={`Gallery image ${idx + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 25vw, 25vw" />
            {idx === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">+{images.length - 5}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setSelectedIndex(null)}>
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-muted-foreground z-10"
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
          >
            ✕
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            ‹
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            ›
          </button>
          <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={images[selectedIndex]} alt={`Gallery image ${selectedIndex + 1}`} fill className="object-contain" sizes="80vw" />
          </div>
          <div className="absolute bottom-4 text-white text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}