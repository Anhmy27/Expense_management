"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      // Redirect về login với error message
      router.push(`/login?error=${error}`);
      return;
    }

    if (token) {
      // Lưu token và redirect về homepage
      localStorage.setItem("token", token);

      // Fetch user info
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          localStorage.setItem("user", JSON.stringify(data));
          router.push("/");
        })
        .catch(() => {
          router.push("/login?error=failed_to_fetch_profile");
        });
    } else {
      // Không có token, redirect về login
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark gradient-mesh">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner"></div>
        <div className="text-xl text-white/80">Đang xử lý đăng nhập...</div>
      </div>
    </div>
  );
}
