"use client";

import { useState, useCallback } from "react";
import BookingsList from "@/components/account/BookingsList";
import ReviewModal from "@/components/account/ReviewModal";

export default function BookingsPageClient() {
  const [reviewTarget, setReviewTarget] = useState(null);

  const handleReviewRequest = useCallback((booking) => {
    setReviewTarget(booking);
  }, []);

  const handleReviewClose = useCallback(() => {
    setReviewTarget(null);
  }, []);

  return (
    <>
      <BookingsList onReviewRequest={handleReviewRequest} />
      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={handleReviewClose} />
      )}
    </>
  );
}