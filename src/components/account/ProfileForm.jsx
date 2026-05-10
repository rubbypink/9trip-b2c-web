"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Profile edit form. Reads current profile from auth context,
 * writes via updateProfileData (which syncs to Firestore).
 */
export default function ProfileForm() {
  const { profile, updateProfileData, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const data = {
      displayName: fd.get("displayName")?.toString().trim() || "",
      phone: fd.get("phone")?.toString().trim() || "",
      address: fd.get("address")?.toString().trim() || "",
      dateOfBirth: fd.get("dateOfBirth")?.toString().trim() || "",
      cccd: fd.get("cccd")?.toString().trim() || "",
      cccdIssueDate: fd.get("cccdIssueDate")?.toString().trim() || "",
      nationality: fd.get("nationality")?.toString().trim() || "Việt Nam",
    };

    try {
      await updateProfileData(data);
      setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Có lỗi xảy ra, vui lòng thử lại." });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Avatar + name header */}
      <div className="flex items-center gap-4">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={profile.displayName}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold ring-2 ring-white">
            {(profile.displayName || profile.email || "U")[0].toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-foreground">{profile.displayName || "Người dùng"}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1">
          Họ và tên
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={profile.displayName || ""}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          placeholder="Nhập họ và tên của bạn"
        />
      </div>

      {/* Email — read only */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={profile.email || ""}
          disabled
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-1 text-muted-foreground cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-muted-foreground">Email không thể thay đổi.</p>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
          Số điện thoại
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone || ""}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          placeholder="Nhập số điện thoại"
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
          Địa chỉ thường trú
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={profile.address || ""}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
          placeholder="Nhập địa chỉ thường trú của bạn"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CCCD */}
        <div>
          <label htmlFor="cccd" className="block text-sm font-medium text-foreground mb-1">
            Số CCCD/CMND
          </label>
          <input
            id="cccd"
            name="cccd"
            type="text"
            defaultValue={profile.cccd || ""}
            maxLength={12}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            placeholder="VD: 001234567890"
          />
        </div>

        {/* CCCD Issue Date */}
        <div>
          <label htmlFor="cccdIssueDate" className="block text-sm font-medium text-foreground mb-1">
            Ngày cấp CCCD
          </label>
          <input
            id="cccdIssueDate"
            name="cccdIssueDate"
            type="date"
            defaultValue={profile.cccdIssueDate || ""}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DOB */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground mb-1">
            Ngày sinh
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={profile.dateOfBirth || ""}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Nationality */}
        <div>
          <label htmlFor="nationality" className="block text-sm font-medium text-foreground mb-1">
            Quốc tịch
          </label>
          <select
            id="nationality"
            name="nationality"
            defaultValue={profile.nationality || "Việt Nam"}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
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
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang lưu...
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </form>
  );
}