"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * PasswordChangeModal — Modal for changing user password.
 * Handles validation, loading states, re-authentication, and error display.
 * @param {{ onClose: () => void, onSuccess: () => void }} props
 */
export default function PasswordChangeModal({ onClose, onSuccess }) {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /** @param {string} code - Firebase error code */
  function getErrorMessage(code) {
    const map = {
      "auth/weak-password": "Mật khẩu mới phải có ít nhất 6 ký tự.",
      "auth/wrong-password": "Mật khẩu hiện tại không chính xác.",
      "auth/requires-recent-login":
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại và thử lại.",
      "auth/invalid-credential": "Mật khẩu hiện tại không chính xác.",
      "auth/too-many-requests":
        "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    };
    return map[code] || "Có lỗi xảy ra, vui lòng thử lại.";
  }

  function validate() {
    if (!currentPassword) return "Vui lòng nhập mật khẩu hiện tại.";
    if (!newPassword) return "Vui lòng nhập mật khẩu mới.";
    if (newPassword.length < 6) return "Mật khẩu mới phải có ít nhất 6 ký tự.";
    if (newPassword !== confirmPassword) return "Mật khẩu mới và xác nhận không khớp.";
    if (newPassword === currentPassword) return "Mật khẩu mới phải khác mật khẩu hiện tại.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  }

  /** @param {string} id */
  function toggleShow(id) {
    if (id === "current") setShowCurrent((s) => !s);
    if (id === "new") setShowNew((s) => !s);
    if (id === "confirm") setShowConfirm((s) => !s);
  }

  function PasswordField({ label, id, value, onChange, show, autoComplete }) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
        <div className="relative">
          <input
            id={id}
            name={id}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            placeholder={label}
          />
          <button
            type="button"
            onClick={() => toggleShow(id)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={show ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          >
            {show ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Đổi mật khẩu</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-emerald-700 font-medium text-sm">Đổi mật khẩu thành công!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <PasswordField
                label="Mật khẩu hiện tại"
                id="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                autoComplete="current-password"
              />
              <PasswordField
                label="Mật khẩu mới"
                id="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                autoComplete="new-password"
              />
              <PasswordField
                label="Xác nhận mật khẩu mới"
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                autoComplete="new-password"
              />

              <p className="text-xs text-muted-foreground">
                Mật khẩu phải có ít nhất 6 ký tự.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    "Đổi mật khẩu"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
