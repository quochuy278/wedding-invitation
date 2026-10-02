"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-label text-sm font-semibold tracking-[0.2em] text-primary">500</p>
      <h1 className="font-heading text-4xl font-semibold">Đã xảy ra lỗi</h1>
      <p className="max-w-md text-muted-foreground">
        Không thể tải trang vào lúc này. Vui lòng thử lại.
      </p>
      <Button onClick={retry}>Thử lại</Button>
    </main>
  );
}
