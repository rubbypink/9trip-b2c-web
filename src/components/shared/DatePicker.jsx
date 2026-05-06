"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * DatePicker — chọn ngày đơn hoặc khoảng ngày (check-in/check-out).
 * Sử dụng native input[type=date] với custom styling Tailwind.
 * @param {{
 *   label?: string,
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   minDate?: string,
 *   maxDate?: string,
 *   placeholder?: string,
 *   required?: boolean,
 *   disabled?: boolean,
 *   error?: string,
 *   className?: string,
 * }} props
 */
export default function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Chọn ngày",
  required = false,
  disabled = false,
  error,
  className,
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          min={minDate || today}
          max={maxDate}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border px-4 py-2.5 text-sm text-foreground transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            error
              ? "border-red-400 focus:ring-red-400/20 focus:border-red-400"
              : "border-border"
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * DateRangePicker — chọn khoảng ngày check-in đến check-out.
 * @param {{
 *   checkInLabel?: string,
 *   checkOutLabel?: string,
 *   checkIn?: string,
 *   checkOut?: string,
 *   onCheckInChange?: (value: string) => void,
 *   onCheckOutChange?: (value: string) => void,
 *   minDate?: string,
 *   maxDate?: string,
 *   required?: boolean,
 *   error?: string,
 *   className?: string,
 * }} props
 */
export function DateRangePicker({
  checkInLabel = "Nhận phòng",
  checkOutLabel = "Trả phòng",
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  minDate,
  maxDate,
  required = false,
  error,
  className,
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          label={checkInLabel}
          value={checkIn}
          onChange={(val) => {
            onCheckInChange?.(val);
            if (checkOut && val > checkOut) {
              onCheckOutChange?.("");
            }
          }}
          minDate={minDate || today}
          maxDate={maxDate}
          required={required}
          error={error}
        />
        <DatePicker
          label={checkOutLabel}
          value={checkOut}
          onChange={onCheckOutChange}
          minDate={checkIn || minDate || today}
          maxDate={maxDate}
          required={required}
          error={error}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}