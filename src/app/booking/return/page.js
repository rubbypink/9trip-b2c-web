/**
 * Payment Return Handler — Client Page
 * /booking/return
 *
 * Users are redirected here after completing payment on the gateway.
 * This page:
 *   - Reads gateway response params from URL
 *   - Verifies payment status
 *   - For PayPal: captures the order
 *   - Redirects to confirmation page on success
 *   - Shows error + retry option on failure
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

/**
 * PaymentReturnPage — handles post-payment redirect from all gateways.
 */
export default function PaymentReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gateway = searchParams.get("gateway");

  const [status, setStatus] = useState("processing"); // processing | success | failed
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState(null);

  /**
   * Poll booking status from Firestore when IPN may not have arrived yet.
   * This covers cases where the user is redirected back before the IPN is processed.
   * @param {string} id - Booking ID
   * @param {number} maxAttempts
   * @returns {Promise<boolean>} true if payment confirmed
   */
  const pollBookingStatus = async (id, maxAttempts = 6) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`/api/bookings/${id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid") {
            return true;
          }
          if (data.paymentStatus === "failed") {
            return false;
          }
        }
      } catch {
        // API may not be ready yet, continue polling
      }
      // Wait 2 seconds between polls
      await new Promise((r) => setTimeout(r, 2000));
    }
    return null; // inconclusive
  };

  /**
   * Process the return based on gateway type.
   * Includes fallback: if return params are inconclusive, poll booking status.
   */
  const processReturn = useCallback(async () => {
    // Recover bookingId from localStorage (stored before redirect)
    const storedBookingId = typeof window !== "undefined" ? localStorage.getItem("9trip_last_booking_id") : null;

    try {
      switch (gateway) {
        case "vnpay": {
          const responseCode = searchParams.get("vnp_ResponseCode");
          const txnRef = searchParams.get("vnp_TxnRef");

          if (responseCode === "00" && txnRef) {
            setBookingId(txnRef);
            setStatus("success");
          } else if (txnRef || storedBookingId) {
            // Return params are inconclusive — poll for IPN result
            const pollResult = await pollBookingStatus(txnRef || storedBookingId);
            if (pollResult === true) {
              setBookingId(txnRef || storedBookingId);
              setStatus("success");
            } else if (pollResult === false) {
              setMessage("Thanh toán VNPay không thành công.");
              setStatus("failed");
            } else {
              setMessage("Đang chờ xác nhận từ VNPay. Vui lòng kiểm tra email hoặc liên hệ hỗ trợ.");
              setStatus("failed");
            }
          } else {
            setMessage("Thanh toán VNPay không thành công hoặc bị hủy.");
            setStatus("failed");
          }
          break;
        }

        case "momo": {
          const resultCode = searchParams.get("resultCode");
          const orderId = searchParams.get("orderId");

          if (resultCode === "0" && orderId) {
            setBookingId(orderId);
            setStatus("success");
          } else if (orderId || storedBookingId) {
            const pollResult = await pollBookingStatus(orderId || storedBookingId);
            if (pollResult === true) {
              setBookingId(orderId || storedBookingId);
              setStatus("success");
            } else if (pollResult === false) {
              setMessage(searchParams.get("message") || "Thanh toán MoMo không thành công.");
              setStatus("failed");
            } else {
              setMessage("Đang chờ xác nhận từ MoMo. Vui lòng kiểm tra email hoặc liên hệ hỗ trợ.");
              setStatus("failed");
            }
          } else {
            setMessage(searchParams.get("message") || "Thanh toán MoMo không thành công hoặc bị hủy.");
            setStatus("failed");
          }
          break;
        }

        case "paypal": {
          const token = searchParams.get("token");
          const storedOrderId = searchParams.get("orderId");

          const orderId = storedOrderId || (typeof window !== "undefined" ? localStorage.getItem("9trip_paypal_order_id") : null);

          if (token && orderId && storedBookingId) {
            const res = await fetch("/api/payments/paypal/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, bookingId: storedBookingId }),
            });

            const data = await res.json();

            if (data.success) {
              setBookingId(data.bookingId || storedBookingId);
              setStatus("success");
            } else {
              setMessage(data.error || "Không thể xác nhận thanh toán PayPal.");
              setStatus("failed");
            }
          } else if (storedBookingId) {
            // Try polling
            const pollResult = await pollBookingStatus(storedBookingId);
            if (pollResult === true) {
              setBookingId(storedBookingId);
              setStatus("success");
            } else {
              setMessage("Thanh toán PayPal bị hủy hoặc thiếu thông tin.");
              setStatus("failed");
            }
          } else {
            setMessage("Thanh toán PayPal bị hủy hoặc thiếu thông tin.");
            setStatus("failed");
          }
          break;
        }

        default:
          setMessage("Không xác định được cổng thanh toán.");
          setStatus("failed");
      }
    } catch (err) {
      console.error("[Return] Processing error:", err);
      setMessage("Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.");
      setStatus("failed");
    }
  }, [gateway, searchParams, router]);

  useEffect(() => {
    processReturn();
  }, [processReturn]);

  // Redirect to confirmation on success
  useEffect(() => {
    if (status === "success" && bookingId) {
      const timer = setTimeout(() => {
        localStorage.removeItem("9trip_last_booking_id");
        localStorage.removeItem("9trip_paypal_order_id");
        router.push(`/booking/confirmation/${bookingId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, bookingId, router]);

  if (status === "processing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner className="w-10 h-10 mb-4" />
        <p className="text-gray-600 font-medium">Đang xử lý thanh toán...</p>
        <p className="text-sm text-gray-400 mt-1">Vui lòng không đóng trang này.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-500">Đang chuyển hướng đến trang xác nhận...</p>
      </div>
    );
  }

  // Failed
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h1>
      <p className="text-gray-500 mb-6 max-w-md">{message || "Có lỗi xảy ra trong quá trình thanh toán."}</p>
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/checkout")}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all"
        >
          Thử lại
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
