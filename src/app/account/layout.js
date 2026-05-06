import AuthGuard from "@/components/auth/AuthGuard";
import AccountSidebar from "@/components/account/AccountSidebar.jsx";

export const metadata = {
  title: "Tài khoản của tôi - 9 Trip",
  description: "Quản lý thông tin cá nhân, đơn hàng và đánh giá của bạn",
};

/**
 * Account dashboard layout — wraps all /account/* pages with AuthGuard and sidebar.
 * This is a server component; AuthGuard and AccountSidebar are client components.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function AccountLayout({ children }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-muted">
        <AccountSidebar />
        {/* Offset content to account for fixed desktop sidebar */}
        <main className="lg:ml-64 min-h-screen p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}