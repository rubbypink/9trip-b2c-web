"use client";

import { useForm } from "react-hook-form";

/**
 * CustomerForm component for gathering contact and identity information during checkout.
 * Collects 8 fields: fullName, email, phone, specialRequests (existing),
 * plus cccd, cccdIssueDate, address, nationality (identity fields).
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
      dateOfBirth: initialData.dateOfBirth || "",
      cccd: initialData.cccd || "",
      cccdIssueDate: initialData.cccdIssueDate || "",
      address: initialData.address || "",
      nationality: initialData.nationality || "Việt Nam",
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
          <label className="block text-sm font-medium text-foreground mb-1">Số điện thoại *</label>
          <input
            type="tel"
            {...register("phone", {
              required: "Vui lòng nhập số điện thoại",
              pattern: {
                value: /^[0-9+ ]{10,15}$/,
                message: "Số điện thoại không hợp lệ",
              },
            })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.phone ? "border-red-500" : "border-border"
            }`}
            placeholder="VD: 0912345678"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Số CCCD/CMND *</label>
          <input
            type="text"
            {...register("cccd", {
              required: "Vui lòng nhập số CCCD/CMND",
              pattern: {
                value: /^[0-9]{9,12}$/,
                message: "Số CCCD không hợp lệ (9-12 chữ số)",
              },
            })}
            className={`customer-cccd w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.cccd ? "border-red-500" : "border-border"
            }`}
            maxLength={12}
            placeholder="VD: 001234567890"
          />
          {errors.cccd && <p className="mt-1 text-xs text-red-500">{errors.cccd.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ngày cấp CCCD *</label>
          <input
            type="date"
            {...register("cccdIssueDate", {
              required: "Vui lòng nhập ngày cấp CCCD",
              validate: (v) => new Date(v) <= new Date() || "Ngày cấp không thể là tương lai",
            })}
            className={`customer-cccd-date w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.cccdIssueDate ? "border-red-500" : "border-border"
            }`}
          />
          {errors.cccdIssueDate && <p className="mt-1 text-xs text-red-500">{errors.cccdIssueDate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ngày sinh *</label>
          <input
            type="date"
            {...register("dateOfBirth", {
              required: "Vui lòng nhập ngày sinh",
              validate: (v) => new Date(v) <= new Date() || "Ngày sinh không thể là tương lai",
            })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${
              errors.dateOfBirth ? "border-red-500" : "border-border"
            }`}
          />
          {errors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Quốc tịch *</label>
          <select
            {...register("nationality", { required: "Vui lòng chọn quốc tịch" })}
            className={`customer-nationality w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-card ${
              errors.nationality ? "border-red-500" : "border-border"
            }`}
          >
            <option value="Việt Nam">Việt Nam</option>
            <option value="Hoa Kỳ">Hoa Kỳ</option>
            <option value="Anh">Anh</option>
            <option value="Pháp">Pháp</option>
            <option value="Nhật Bản">Nhật Bản</option>
            <option value="Hàn Quốc">Hàn Quốc</option>
            <option value="Trung Quốc">Trung Quốc</option>
            <option value="Úc">Úc</option>
            <option value="Canada">Canada</option>
            <option value="Đức">Đức</option>
            <option value="Thái Lan">Thái Lan</option>
            <option value="Singapore">Singapore</option>
          </select>
          {errors.nationality && <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Địa chỉ thường trú *</label>
        <textarea
          {...register("address", { required: "Vui lòng nhập địa chỉ thường trú" })}
          className={`customer-address w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none ${
            errors.address ? "border-red-500" : "border-border"
          }`}
          rows={2}
          placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
        ></textarea>
        {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
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