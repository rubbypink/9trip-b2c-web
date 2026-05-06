/**
 * Shared navigation definitions for the account dashboard sidebar.
 * Centralized so layout and client sidebar can share the same list.
 */

/** @type {{ label: string; href: string; icon: string }[]} */
export const ACCOUNT_NAV_ITEMS = [
  {
    label: "Thông tin cá nhân",
    href: "/account/profile",
    icon: "UserCircleIcon",
  },
  {
    label: "Lịch sử đặt tour",
    href: "/account/bookings",
    icon: "CalendarIcon",
  },
  {
    label: "Danh sách yêu thích",
    href: "/account/wishlist",
    icon: "HeartIcon",
  },
];

export default ACCOUNT_NAV_ITEMS;