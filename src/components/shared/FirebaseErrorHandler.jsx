'use client';

import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

/**
 * Ánh xạ mã lỗi Firebase Auth sang thông báo tiếng Việt thân thiện
 * @param {string} errorCode - Mã lỗi từ Firebase (vd: "auth/user-not-found")
 * @returns {string} Thông báo lỗi tiếng Việt
 */
function getVietnameseMessage(errorCode) {
  const messages = {
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/wrong-password': 'Mật khẩu không chính xác. Vui lòng thử lại.',
    'auth/email-already-in-use': 'Email này đã được sử dụng. Vui lòng dùng email khác.',
    'auth/invalid-email': 'Email không hợp lệ. Vui lòng kiểm tra lại.',
    'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
    'auth/too-many-requests': 'Bạn đã thử quá nhiều lần. Vui lòng đợi và thử lại sau.',
    'auth/network-request-failed': 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.',
    'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã bị đóng. Vui lòng thử lại.',
    'auth/account-exists-with-different-credential': 'Tài khoản đã tồn tại với phương thức đăng nhập khác.',
    'auth/provider-already-linked': 'Tài khoản này đã được liên kết với phương thức đăng nhập đó.',
    'auth/requires-recent-login': 'Vui lòng đăng nhập lại để thực hiện thao tác này.',
    'auth/user-disabled': 'Tài khoản của bạn đã bị vô hiệu hóa.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được kích hoạt.',
    'auth/expired-action-code': 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu lại.',
    'auth/invalid-action-code': 'Mã xác nhận không hợp lệ.',
  };

  return messages[errorCode] || 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
}

/**
 * Component hiển thị lỗi xác thực Firebase với thông báo tiếng Việt
 * @param {Object} props
 * @param {Error|{code: string, message: string}|null} props.error - Đối tượng lỗi từ Firebase
 * @param {Function} [props.onDismiss] - Callback khi người dùng đóng thông báo lỗi
 * @param {string} [props.className] - Class bổ sung cho container
 */
export default function FirebaseErrorHandler({ error, onDismiss, className = '' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!error || !visible) return null;

  const message = getVietnameseMessage(error.code);

  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 transform rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">Đăng nhập thất bại</p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
          aria-label="Đóng thông báo lỗi"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}