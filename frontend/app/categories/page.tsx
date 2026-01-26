"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

interface Category {
  _id: string;
  name: string;
  type: "in" | "out";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState<"all" | "in" | "out">("all");

  const [formData, setFormData] = useState({
    name: "",
    type: "out" as "in" | "out",
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "Fetching categories with token:",
        token ? "exists" : "missing",
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/categories`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Categories response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Categories data:", data);
        setCategories(data);
      } else {
        const error = await response.json();
        console.error("Categories error:", error);
        setToast({
          message: error.message || "Không thể tải danh mục",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setToast({ message: "Có lỗi xảy ra khi tải dữ liệu", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingCategory
        ? `${process.env.NEXT_PUBLIC_API_URL}/categories/${editingCategory._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/categories`;

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      setToast({
        message: editingCategory
          ? "Cập nhật danh mục thành công!"
          : "Tạo danh mục thành công!",
        type: "success",
      });
      setShowCreateModal(false);
      setEditingCategory(null);
      setFormData({ name: "", type: "out" });
      fetchCategories();
    } catch (error: any) {
      setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
    });
    setShowCreateModal(true);
  };

  const handleDelete = (category: Category) => {
    setConfirmModal({
      title: "Xóa danh mục",
      message: `Bạn có chắc muốn xóa danh mục "${category.name}"?`,
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/categories/${category._id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
          }

          setToast({ message: "Đã xóa danh mục thành công!", type: "success" });
          setConfirmModal(null);
          fetchCategories();
        } catch (error: any) {
          setToast({
            message: error.message || "Có lỗi xảy ra",
            type: "error",
          });
          setConfirmModal(null);
        }
      },
    });
  };

  const filteredCategories = categories.filter((cat) => {
    if (filterType === "all") return true;
    return cat.type === filterType;
  });

  const incomeCount = categories.filter((c) => c.type === "in").length;
  const expenseCount = categories.filter((c) => c.type === "out").length;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-xl text-white/80">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen gradient-dark gradient-mesh">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}

      {/* Header */}
      <header className="glass-dark sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Quản Lý Danh Mục</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="gradient-info text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Trang chủ
            </Link>
            <button
              onClick={logout}
              className="gradient-danger text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 animate-fadeIn">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng danh mục</p>
                <p className="text-2xl font-bold text-white">
                  {categories.length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
                <span className="text-xl">↑</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Thu nhập</p>
                <p className="text-2xl font-bold text-white">{incomeCount}</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-danger rounded-xl flex items-center justify-center">
                <span className="text-xl">↓</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Chi tiêu</p>
                <p className="text-2xl font-bold text-white">{expenseCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
          <div className="flex gap-2">
            {(["all", "in", "out"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterType === type
                    ? "gradient-primary text-white"
                    : "glass text-white/70 hover:text-white"
                }`}
              >
                {type === "all"
                  ? "Tất cả"
                  : type === "in"
                    ? "↑ Thu nhập"
                    : "↓ Chi tiêu"}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: "", type: "out" });
              setShowCreateModal(true);
            }}
            className="gradient-success text-white px-6 py-3 rounded-xl hover-lift btn-gradient font-medium transition-all flex items-center gap-2"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tạo Danh Mục
          </button>
        </div>

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Chưa có danh mục nào
            </h3>
            <p className="text-gray-400 mb-6">
              Tạo danh mục đầu tiên để quản lý giao dịch!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="gradient-success text-white px-6 py-3 rounded-xl hover-lift btn-gradient font-medium transition-all inline-flex items-center gap-2"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo Danh Mục
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category._id}
                className={`glass p-5 rounded-2xl hover-lift transition-all border-l-4 ${
                  category.type === "in" ? "border-green-500" : "border-red-500"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        category.type === "in"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {category.type === "in" ? "↑" : "↓"}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {category.type === "in" ? "Thu nhập" : "Chi tiêu"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-all"
                      title="Sửa"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-all"
                      title="Xóa"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Tạo lúc:{" "}
                  {new Date(category.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-md w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              {editingCategory ? "Sửa Danh Mục" : "Tạo Danh Mục Mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Tên danh mục
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="VD: Ăn uống, Lương..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Loại danh mục
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "in" })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.type === "in"
                        ? "gradient-success text-white"
                        : "glass text-white/70 hover:text-white"
                    }`}
                  >
                    ↑ Thu nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "out" })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.type === "out"
                        ? "gradient-danger text-white"
                        : "glass text-white/70 hover:text-white"
                    }`}
                  >
                    ↓ Chi tiêu
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-success text-white py-3 px-4 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                >
                  {editingCategory ? "Cập nhật" : "Tạo danh mục"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-500 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
