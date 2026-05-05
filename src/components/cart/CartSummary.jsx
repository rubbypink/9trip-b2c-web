import Link from "next/link";
import { formatPrice } from "@/lib/utils";

/**
 * CartSummary — shows subtotal and checkout button for cart page.
 * @param {Object} props
 * @param {number} props.totalItems
 * @param {number} props.totalPrice
 */
export default function CartSummary({ totalItems, totalPrice }) {
  if (totalItems === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h3 className="text-lg font-bold text-slate-800">Tổng giỏ hàng</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Tạm tính ({totalItems} sản phẩm)</span>
          <span className="font-semibold text-slate-800">{formatPrice(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Phí dịch vụ</span>
          <span className="text-green-600 font-medium">Miễn phí</span>
        </div>
        <hr className="border-slate-200" />
        <div className="flex justify-between text-base font-bold text-slate-800">
          <span>Tổng cộng</span>
          <span className="text-orange-600">{formatPrice(totalPrice)}</span>
        </div>
        <p className="text-xs text-slate-400">Đã bao gồm thuế VAT (nếu có)</p>
      </div>
      <Link
        href="/checkout"
        className="block w-full text-center rounded-xl bg-orange-600 text-white py-3 font-bold text-sm hover:bg-orange-700 transition-colors"
      >
        Tiến hành đặt chỗ
      </Link>
      <p className="text-xs text-center text-slate-400">
        Bạn sẽ không bị tính tiền ngay bây giờ
      </p>
    </div>
  );
}