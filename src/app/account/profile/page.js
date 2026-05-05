import ProfileForm from "@/components/account/ProfileForm";

export const metadata = {
  title: "Thông tin cá nhân - 9 Trip",
};

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Thông tin cá nhân</h1>
      <ProfileForm />
    </div>
  );
}