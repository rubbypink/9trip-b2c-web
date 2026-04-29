"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getBookingById } from "@/lib/firestore";
import { formatCurrency, formatDate } from "@/lib/utils";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Image from "next/image";

/**
 * Booking Confirmation Page.
 */
export default function ConfirmationPage({ params }) {
  const { id } = use(params);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const data = await getBookingById(id);
        setBooking(data);
      } catch (err) {
        console.error("Error fetching booking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h1>
        <p className="text-gray-500 mb-6">Có lỗi xảy ra hoặc đơn hàng không tồn tại.</p>
        <Link href="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-600 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Đặt chỗ thành công!</h1>
            <p className="opacity-90">Mã đơn hàng: <span className="font-mono font-bold">{booking.bookingCode}</span></p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Thông tin khách hàng</h3>
                <p className="font-bold text-gray-900">{booking.contactInfo?.fullName}</p>
                <p className="text-gray-600">{booking.contactInfo?.email}</p>
                <p className="text-gray-600">{booking.contactInfo?.phone}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Trạng thái thanh toán</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
                <p className="text-xs text-gray-500 mt-2">Phương thức: <span className="uppercase">{booking.paymentGateway}</span></p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Chi tiết dịch vụ</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-900">Dịch vụ ID: {booking.serviceId}</span>
                <span className="text-sm text-gray-500 uppercase">{booking.serviceType}</span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Ngày bắt đầu:</span>
                  <span className="font-medium text-gray-900">{formatDate(booking.startDate)}</span>
                </div>
                {booking.endDate && (
                  <div className="flex justify-between">
                    <span>Ngày kết thúc:</span>
                    <span className="font-medium text-gray-900">{formatDate(booking.endDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Số lượng khách:</span>
                  <span className="font-medium text-gray-900">
                    {booking.guests?.adults} người lớn
                    {booking.guests?.children > 0 && `, ${booking.guests?.children} trẻ em`}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatCurrency(booking.pricing?.subtotal)}</span>
              </div>
              {booking.pricing?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(booking.pricing?.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Thuế (10%)</span>
                <span>{formatCurrency(booking.pricing?.tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                <span className="text-2xl font-bold text-primary-600">{formatCurrency(booking.pricing?.total)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link 
                href="/account/bookings" 
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-center hover:bg-gray-200 transition-colors"
              >
                Quản lý đơn hàng
              </Link>
              <Link 
                href="/" 
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold text-center hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
              >
                Tiếp tục khám phá
              </Link>
            </div>

            {/* Upsells — Dịch vụ phổ biến cùng khu vực */}
            <div className="pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Khám phá thêm hoạt động hấp dẫn</h3>
              <p className="text-sm text-gray-500 mb-5">Những hoạt động được yêu thích nhất gần khu vực của bạn</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: "Tour cáp treo Hòn Thơm", price: "600.000đ", img: "", desc: "Trải nghiệm cáp treo vượt biển dài nhất thế giới" },
                  { name: "VinWonders Phú Quốc", price: "800.000đ", img: "", desc: "Công viên giải trí & vui chơi hàng đầu" },
                  { name: "Tour lặn ngắm san hô", price: "500.000đ", img: "", desc: "Khám phá đại dương Nam đảo Phú Quốc" },
                ].map((activity, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all group cursor-pointer">
                    <div className="w-full h-24 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-3">
                      <span className="text-2xl">{["🚡", "🎢", "🐠"][idx]}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm group-hover:text-primary transition-colors">{activity.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{activity.desc}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-primary">Từ {activity.price}</span>
                      <Link
                        href="/activities"
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Xem thêm →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
