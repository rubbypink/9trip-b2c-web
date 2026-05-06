import React from 'react';

/**
 * OverviewPanel — Mô tả, điểm nổi bật, tiện nghi sơ lược, check-in/out.
 * @param {{ hotel: Object }} props
 */
function OverviewPanel({ hotel }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {hotel.description && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Giới thiệu
          </h3>
          <div className="prose max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: hotel.description }} />
        </div>
      )}

      {/* Highlights */}
      {hotel.highlights?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Điểm nổi bật</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hotel.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities Preview */}
      {hotel.amenities?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Tiện nghi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hotel.amenities.slice(0, 9).map((amenity, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {amenity}
              </div>
            ))}
            {hotel.amenities.length > 9 && (
              <div className="text-sm text-primary font-medium flex items-center">
                +{hotel.amenities.length - 9} tiện ích khác
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in / Check-out */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Giờ nhận / trả phòng</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nhận phòng</p>
              <p className="font-medium text-foreground">{hotel.policies?.checkIn || "14:00"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trả phòng</p>
              <p className="font-medium text-foreground">{hotel.policies?.checkOut || "12:00"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(OverviewPanel);
