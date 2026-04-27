import BookingsPageClient from "./BookingsPageClient";

export const metadata = {
  title: "Lịch sử đặt tour - 9Trip",
};

export default function BookingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Lịch sử đặt tour</h1>
      <BookingsPageClient />
    </div>
  );
}