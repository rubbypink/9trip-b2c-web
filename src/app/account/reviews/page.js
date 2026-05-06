import UserReviewsList from "@/components/account/UserReviewsList";

export const metadata = {
  title: "Đánh giá của tôi - 9 Trip",
};

/**
 * User Reviews page — displays reviews written by the logged-in user.
 */
export default function UserReviewsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Đánh giá của tôi
        </h1>
        <p className="text-muted-foreground mt-1">
          Lịch sử các đánh giá và nhận xét bạn đã viết cho các dịch vụ.
        </p>
      </div>
      <UserReviewsList />
    </div>
  );
}