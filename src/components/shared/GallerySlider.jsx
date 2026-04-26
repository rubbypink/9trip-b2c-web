"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * GallerySlider — slider ảnh cho trang chi tiết Tour/Hotel/Activity.
 * Hỗ trợ thumbnail navigation và full-screen lightbox.
 * @param {{
 *   images: string[],
 *   alt?: string,
 *   className?: string,
 *   aspectRatio?: string,
 * }} props
 */
export default function GallerySlider({
  images = [],
  alt = "Gallery image",
  className,
  aspectRatio = "aspect-[16/10]",
}) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images.length) {
    return (
      <div
        className={cn(
          aspectRatio,
          "rounded-xl bg-gray-200 flex items-center justify-center",
          className
        )}
      >
        <svg
          className="h-16 w-16 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const goTo = (index) => {
    setCurrent(Math.max(0, Math.min(images.length - 1, index)));
  };

  return (
    <>
      <div className={cn("relative group overflow-hidden rounded-xl", aspectRatio, className)}>
        {/* Main Image */}
        <div className="relative w-full h-full">
          <Image
            src={images[current]}
            alt={`${alt} ${current + 1}`}
            fill
            className="object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 66vw"
            priority={current === 0}
            onClick={() => setLightboxOpen(true)}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goTo(current - 1);
              }}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 z-10",
                "flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-md hover:bg-white transition-colors",
                current === 0 && "hidden"
              )}
              aria-label="Ảnh trước"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goTo(current + 1);
              }}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 z-10",
                "flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-md hover:bg-white transition-colors",
                current === images.length - 1 && "hidden"
              )}
              aria-label="Ảnh sau"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === current
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={img}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Đóng"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(current - 1);
                }}
                disabled={current === 0}
                aria-label="Ảnh trước"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(current + 1);
                }}
                disabled={current === images.length - 1}
                aria-label="Ảnh sau"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="relative w-full max-w-4xl aspect-[16/10] mx-4">
            <Image
              src={images[current]}
              alt={`${alt} ${current + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 900px) 100vw, 80vw"
              priority
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white">
            {current + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}