import ImagesStudioClient from "@/components/account/ImagesStudioClient";

export const metadata = {
  title: "Images Studio - 9 Trip",
};

export default function ImagesStudioPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Images Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Công cụ tạo và chỉnh sửa hình ảnh AI.
        </p>
      </div>
      <ImagesStudioClient />
    </div>
  );
}
