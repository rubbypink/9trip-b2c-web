"use client";

import { useForm } from "react-hook-form";

/**
 * CustomerForm component for gathering contact information during checkout.
 * @param {{ onSubmit: Function, initialData?: Object }} props
 */
export default function CustomerForm({ onSubmit, initialData = {} }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: initialData.displayName || "",
      email: initialData.email || "",
      phone: initialData.phone || "",
      specialRequests: "",
      ...initialData,
    },
  });

  return (
    <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Họ và tên *</label>
          <input
            type="text"
            {...register("fullName", { required: "Vui lòng nhập họ tên" })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.fullName ? "border-red-500" : "border-border"
            }`}
            placeholder="VD: Nguyễn Văn A"
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
          <input
            type="email"
            {...register("email", {
              required: "Vui lòng nhập email",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Email không hợp lệ",
              },
            })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.email ? "border-red-500" : "border-border"
            }`}
            placeholder="email@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Số điện thoại *</label>
        <input
          type="tel"
          {...register("phone", { 
            required: "Vui lòng nhập số điện thoại",
            pattern: {
              value: /^[0-9+ ]{10,15}$/,
              message: "Số điện thoại không hợp lệ"
            }
          })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
            errors.phone ? "border-red-500" : "border-border"
          }`}
          placeholder="VD: 0912345678"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Yêu cầu đặc biệt (tùy chọn)</label>
        <textarea
          {...register("specialRequests")}
          rows="3"
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="VD: Tôi muốn phòng hướng biển, thức ăn chay..."
        ></textarea>
      </div>
    </form>
  );
}
