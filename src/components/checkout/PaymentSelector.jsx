"use client";

/**
 * PaymentSelector component for choosing payment method.
 * @param {{ selected: string, onChange: Function }} props
 */
export default function PaymentSelector({ selected, onChange }) {
  const methods = [
    {
      id: "vnpay",
      name: "VNPay",
      description: "Thẻ ATM nội địa, QR Pay",
      icon: <span className="font-bold text-blue-600">VN<span className="text-red-600">Pay</span></span>,
    },
    {
      id: "momo",
      name: "Ví MoMo",
      description: "Thanh toán qua ứng dụng MoMo",
      icon: <div className="w-6 h-6 bg-pink-600 rounded flex items-center justify-center text-[10px] text-white font-bold">M</div>,
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Thanh toán qua ví PayPal",
      icon: <span className="font-bold text-blue-800 italic">PayPal</span>,
    },
    {
      id: "cash",
      name: "Tiền mặt / Chuyển khoản",
      description: "Thanh toán trực tiếp hoặc tại quầy",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <label
          key={method.id}
          className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
            selected === method.id
              ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <input
            type="radio"
            name="payment-method"
            className="hidden"
            checked={selected === method.id}
            onChange={() => onChange(method.id)}
          />
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
            {method.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900">{method.name}</h4>
            <p className="text-xs text-gray-500">{method.description}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected === method.id ? "border-primary-500" : "border-gray-300"
          }`}>
            {selected === method.id && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />}
          </div>
        </label>
      ))}
    </div>
  );
}
