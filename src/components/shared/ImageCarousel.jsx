"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@9trip/shared/constants";

/**
 * ImageCarousel — Horizontal snap-scroll carousel with dot indicators,
 * lightbox integration, and overlay "View all photos" button.
 *
 * Features:
 * - Horizontal snap-scroll on mobile/desktop
 * - Dot indicators for current slide
 * - Click image → opens GalleryWithLightbox
 * - "Xem tất cả ảnh" overlay button at bottom-right
 * - Responsive aspect ratio (21/9 desktop, 4/3 mobile)
 *
 * @param {{
 *   images: string[],
 *   alt?: string,
 *   aspectRatio?: string,
 *   showOverlay?: boolean,
 *   className?: string,
 *   serviceId?: string,
 *   serviceType?: string,
 * }} props
 */
export default function ImageCarousel({
  images = [],
  alt = "Gallery image",
  aspectRatio = "aspect-[4/3] md:aspect-[21/9]",
  showOverlay = true,
  className = "",
  serviceId,
  serviceType,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const scrollRef = useRef(null);

  const hasImages = images.length > 0;

  // Synchronize dot indicator with scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    const idx = Math.round(scrollLeft / width);
    if (idx >= 0 && idx < images.length) {
      setCurrentIndex(idx);
    }
  }, [images.length]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStart === null || !scrollRef.current) return;
      const diff = touchStart - e.changedTouches[0].clientX;
      const threshold = 50;
      if (Math.abs(diff) > threshold) {
        const newIndex = diff > 0
          ? Math.min(currentIndex + 1, images.length - 1)
          : Math.max(currentIndex - 1, 0);
        
        const el = scrollRef.current;
        el.scrollTo({
          left: newIndex * el.clientWidth,
          behavior: "smooth"
        });
        setCurrentIndex(newIndex);
      }
      setTouchStart(null);
    },
    [touchStart, currentIndex, images.length]
  );

  // Scroll to a specific index
  const scrollToIndex = useCallback((idx) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: "smooth"
    });
    setCurrentIndex(idx);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Reset index when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images.length]);

  useEffect(() => {
    if (showLightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showLightbox]);

  if (!hasImages) {
    return (
      <div className={`bg-muted rounded-xl flex items-center justify-center h-64 ${className}`}>
        <span className="text-muted-foreground text-lg">Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group ${className}`} data-service-type={serviceType} data-service-id={serviceId}>
        {/* Snap-scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${aspectRatio}`}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setShowLightbox(true)}
              className="relative w-full h-full flex-shrink-0 snap-start cursor-pointer bg-muted"
              aria-label={`${alt} ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`${alt} ${idx + 1}`}
                fill
                className="object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                priority={idx === 0}
                fetchPriority={idx === 0 ? "high" : "auto"}
                loading={idx === 0 ? undefined : "lazy"}
                sizes="(max-width: 768px) 100vw, 90vw"
              />
            </button>
          ))}
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "bg-card w-4 shadow-md"
                    : "bg-background/50 hover:bg-background/70"
                }`}
                aria-label={`Chuyển đến ảnh ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* "Xem tất cả ảnh" overlay button */}
        {showOverlay && images.length > 1 && (
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            className="absolute bottom-4 right-4 z-10 rounded-lg bg-black/60 text-white text-sm font-medium px-3 py-1.5 hover:bg-black/80 transition-colors backdrop-blur-sm"
          >
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Xem tất cả {images.length} ảnh
            </span>
          </button>
        )}

        {/* Left/Right navigation arrows (desktop only) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 hover:bg-background/90 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md z-10"
              aria-label="Ảnh trước"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(Math.min(images.length - 1, currentIndex + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 hover:bg-background/90 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md z-10"
              aria-label="Ảnh sau"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Lightbox overlay — inline implementation */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-3xl hover:text-muted-foreground z-10"
            onClick={() => setShowLightbox(false)}
            aria-label="Đóng"
          >
            ✕
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
            onClick={(e) => {
              e.stopPropagation();
              const newIdx = (currentIndex - 1 + images.length) % images.length;
              setCurrentIndex(newIdx);
              scrollToIndex(newIdx);
            }}
            aria-label="Ảnh trước"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
            onClick={(e) => {
              e.stopPropagation();
              const newIdx = (currentIndex + 1) % images.length;
              setCurrentIndex(newIdx);
              scrollToIndex(newIdx);
            }}
            aria-label="Ảnh sau"
          >
            ›
          </button>
          <div
            className="relative w-full max-w-5xl h-[85vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              fill
              className="object-contain"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="90vw"
              priority
            />
          </div>
          <div className="absolute bottom-4 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
