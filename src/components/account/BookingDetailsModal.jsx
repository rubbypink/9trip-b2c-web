"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

/**
 * BookingDetailsModal — Hiển thị chi tiết booking và cho phép Hủy / Modify từng item.
 * Cập nhật: 10 May 2026
 * 
 * @param {{ booking: Object, onClose: Function, onUpdateBooking: Function }} props
 */
export default function BookingDetailsModal({ booking, onClose, onUpdateBooking }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [modifyingItem, setModifyingItem] = useState(null);
  const [modifyData, setModifyData] = useState({ startDate: '', endDate: '', quantity: 1 });
  const [notice, setNotice] = useState(null);

  if (!booking) return null;

  // Support both object/map and array formats for booking.items
  // Lấy key của object để gán làm item.id (vì Object.values làm mất key)
  const items = booking.items
    ? (Array.isArray(booking.items) 
        ? booking.items 
        : Object.entries(booking.items).map(([key, val]) => ({ ...val, id: val.id || key })))
    : [];

  const handleCancelItem = async (itemId) => {
    if (!confirm("Bạn có chắc chắn muốn hủy dịch vụ này?")) return;
    setLoadingAction(`cancel-${itemId}`);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/items/${itemId}/cancel`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setNotice("Đã xóa dịch vụ. 9 Trip sẽ liên hệ xử lý hoàn tiền nếu bạn đã thanh toán.");
        onUpdateBooking({ ...booking, items: Object.keys(booking.items).reduce((acc, key) => {
          if (key !== itemId) acc[key] = booking.items[key];
          return acc;
        }, {}), pricing: data.updatedPricing, status: data.isCancelled ? 'cancelled' : booking.status });
      } else {
        alert("Lỗi khi hủy: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    }
    setLoadingAction(null);
  };

  const handleOpenModify = (item) => {
    setModifyingItem(item);
    setModifyData({
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : '',
      quantity: item.rooms || item.adults || 1
    });
  };

  const handleSubmitModify = async () => {
    if (!modifyingItem) return;
    setLoadingAction(`modify-${modifyingItem.id}`);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/items/${modifyingItem.id}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifyData)
      });
      const data = await res.json();
      if (data.success) {
        setNotice("Đã cập nhật dịch vụ thành công.");
        onUpdateBooking({
          ...booking,
          items: { ...booking.items, [modifyingItem.id]: data.item },
          pricing: data.updatedPricing
        });
        setModifyingItem(null);
      } else {
        alert("Lỗi khi cập nhật: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    }
    setLoadingAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold">Chi tiết Booking: {booking.bookingCode || booking.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {notice && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              {notice}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Người đặt:</p>
              <p className="font-medium">{booking.contactInfo?.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email:</p>
              <p className="font-medium">{booking.contactInfo?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">SĐT:</p>
              <p className="font-medium">{booking.contactInfo?.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Trạng thái thanh toán:</p>
              <p className="font-medium">{booking.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 text-lg">Danh sách dịch vụ</h3>
            <div className="space-y-4">
              {items.length === 0 ? (
                <p className="text-muted-foreground">Booking không có dịch vụ nào.</p>
              ) : items.map(item => {
                const isNonRefundable = item['cancel-policy'] === 'non-refundable';
                const isPast = new Date(item.startDate) <= new Date();
                const canModifyCancel = !isNonRefundable && !isPast && booking.status !== 'canceled' && booking.status !== 'cancelled';

                return (
                  <div key={item.id} className="p-4 border border-border rounded-xl bg-surface-1/50 flex flex-col sm:flex-row gap-4 justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{item.serviceTitle || item.title || item.name || item.serviceName || 'Không có tên'}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.startDate && formatDate(item.startDate)} 
                        {item.endDate && ` - ${formatDate(item.endDate)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.serviceType === 'hotel_room' || item.serviceType === 'hotel' ? (
                          `Số lượng: ${item.rooms || item.adults || 1} phòng`
                        ) : item.serviceType === 'activity' ? (
                          `Số lượng: ${item.adults || 1} vé`
                        ) : item.serviceType === 'car' || item.serviceType === 'rental' ? (
                          `Số lượng: ${item.adults || 1} xe`
                        ) : (
                          `Số lượng: ${item.adults || 1} người lớn${item.children > 0 ? `, ${item.children} trẻ em` : ''}${item.infants > 0 ? `, ${item.infants} em bé` : ''}`
                        )}
                      </p>
                      <p className="font-medium text-primary-600 mt-2">{formatCurrency(item.total || item.baseTotal || item.basePrice || 0)}</p>
                    </div>
                    
                    {canModifyCancel && (
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => handleOpenModify(item)}
                          disabled={loadingAction !== null}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => handleCancelItem(item.id)}
                          disabled={loadingAction !== null}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center disabled:opacity-50"
                        >
                          {loadingAction === `cancel-${item.id}` && <LoadingSpinner className="w-3 h-3 mr-1" />}
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Tổng cộng:</span>
              <span className="text-primary-600">{formatCurrency(booking.pricing?.total || 0)}</span>
            </div>
          </div>
        </div>

        {modifyingItem && (
          <div className="absolute inset-0 bg-card rounded-2xl p-6 flex flex-col z-20">
            <h3 className="font-bold text-lg mb-4">Sửa dịch vụ: {modifyingItem.serviceTitle || modifyingItem.title || modifyingItem.name || modifyingItem.serviceName || 'Không có tên'}</h3>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                <input 
                  type="date" 
                  value={modifyData.startDate}
                  onChange={e => setModifyData({...modifyData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {modifyingItem.serviceType === 'hotel_room' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                  <input 
                    type="date" 
                    value={modifyData.endDate}
                    onChange={e => setModifyData({...modifyData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}

              {modifyingItem.serviceType === 'hotel_room' || modifyingItem.serviceType === 'hotel' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng phòng</label>
                  <input 
                    type="number" 
                    min="1"
                    value={modifyData.quantity}
                    onChange={e => setModifyData({...modifyData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng (người/vé)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={modifyData.quantity}
                    onChange={e => setModifyData({...modifyData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button 
                onClick={() => setModifyingItem(null)}
                className="px-4 py-2 font-medium text-muted-foreground hover:bg-muted rounded-lg"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSubmitModify}
                disabled={loadingAction !== null}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center"
              >
                {loadingAction === `modify-${modifyingItem.id}` && <LoadingSpinner className="w-4 h-4 mr-2 border-white" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
