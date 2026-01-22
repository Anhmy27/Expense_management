"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const response = await api.register({ username, password });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark gradient-mesh relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn relative z-10 border border-white/50">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 gradient-success rounded-2xl flex items-center justify-center animate-pulse-glow">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Tạo tài khoản
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Đăng ký để bắt đầu quản lý chi tiêu
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="animate-fadeIn stagger-1" style={{ opacity: 0 }}>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              Tên đăng nhập
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 hover:border-green-300"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
          </div>

          <div className="animate-fadeIn stagger-2" style={{ opacity: 0 }}>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 hover:border-green-300"
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                required
              />
            </div>
          </div>

          <div className="animate-fadeIn stagger-3" style={{ opacity: 0 }}>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 hover:border-green-300"
                placeholder="Nhập lại mật khẩu"
                required
              />
            </div>
          </div>

          <div className="animate-fadeIn stagger-4" style={{ opacity: 0 }}>
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-success text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Đang đăng ký...
                </div>
              ) : (
                "Đăng ký"
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div
          className="relative flex items-center my-6 animate-fadeIn stagger-5"
          style={{ opacity: 0 }}
        >
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="px-4 text-sm text-gray-500 dark:text-gray-400">
            Hoặc
          </span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* Google Sign In Button */}
        <div className="animate-fadeIn stagger-6" style={{ opacity: 0 }}>
          <button
            onClick={() =>
              (window.location.href = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "")}/api/auth/google`)
            }
            className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center gap-3 hover-lift"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng ký với Google
          </button>
        </div>

        <div
          className="mt-6 text-center animate-fadeIn stagger-7"
          style={{ opacity: 0 }}
        >
          <p className="text-gray-600 dark:text-gray-400">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-green-500 hover:text-green-600 font-semibold transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
