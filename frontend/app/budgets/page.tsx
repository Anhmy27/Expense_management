"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

interface Budget {
  _id: string;
  categoryId: {
    _id: string;
    name: string;
    type: string;
  };
  amount: number;
  period: "monthly" | "weekly";
  startDate: string;
  endDate: string;
  warningThreshold: number;
  spent?: number;
  percentage?: number;
  remaining?: number;
  isWarning?: boolean;
  isExceeded?: boolean;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

export default function BudgetsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    period: "monthly" as "monthly" | "weekly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    warningThreshold: "80",
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
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        console.log("Budgets data:", budgetsData);
        budgetsData.forEach((b: any, i: number) => {
          console.log(`Budget ${i}:`, {
            category: b.categoryId.name,
            categoryId: b.categoryId._id,
            amount: b.amount,
            spent: b.spent,
            percentage: b.percentage,
            startDate: b.startDate,
            endDate: b.endDate,
          });
        });
        setBudgets(budgetsData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.filter((c: Category) => c.type === "out"));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const url = editingBudget
        ? `${process.env.NEXT_PUBLIC_API_URL}/budgets/${editingBudget._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/budgets`;

      const response = await fetch(url, {
        method: editingBudget ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          warningThreshold: parseInt(formData.warningThreshold),
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingBudget(null);
        setFormData({
          categoryId: "",
          amount: "",
          period: "monthly",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          warningThreshold: "80",
        });
        setToast({
          message: editingBudget
            ? "Đã cập nhật ngân sách thành công!"
            : "Đã tạo ngân sách thành công!",
          type: "success",
        });
        fetchData();
      } else {
        const error = await response.json();
        setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
      }
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "Có lỗi xảy ra", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      title: "Xóa ngân sách",
      message: "Bạn có chắc muốn xóa ngân sách này?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/budgets/${id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            setToast({
              message: "Đã xóa ngân sách thành công!",
              type: "success",
            });
            fetchData();
          } else {
            setToast({
              message: "Có lỗi xảy ra khi xóa ngân sách",
              type: "error",
            });
          }
        } catch (error) {
          console.error("Error:", error);
          setToast({ message: "Có lỗi xảy ra", type: "error" });
        }
      },
    });
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId._id,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split("T")[0],
      endDate: new Date(budget.endDate).toISOString().split("T")[0],
      warningThreshold: budget.warningThreshold.toString(),
    });
    setShowCreateModal(true);
  };

  const getProgressColor = (budget: Budget) => {
    if (budget.isExceeded) return "bg-red-500";
    if (budget.isWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark gradient-mesh">
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Quản lý Ngân sách</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingBudget(null);
                setFormData({
                  categoryId: "",
                  amount: "",
                  period: "monthly",
                  startDate: new Date().toISOString().split("T")[0],
                  endDate: "",
                  warningThreshold: "80",
                });
                setShowCreateModal(true);
              }}
              className="gradient-primary text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo Ngân sách
            </button>
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
        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <div
              key={budget._id}
              className={`glass-card p-6 rounded-2xl hover-lift relative overflow-hidden ${
                budget.isExceeded
                  ? "border-2 border-red-500/50"
                  : budget.isWarning
                    ? "border-2 border-yellow-500/50"
                    : ""
              }`}
            >
              {/* Warning/Exceeded Badge */}
              {budget.isExceeded && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                  <span>🚨</span> VƯỢT NGÂN SÁCH
                </div>
              )}
              {budget.isWarning && !budget.isExceeded && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                  <span>⚠️</span> ĐÃ VƯỢT NGƯỠNG CẢNH BÁO
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div
                  className={
                    budget.isExceeded || budget.isWarning ? "pr-32" : ""
                  }
                >
                  <h3 className="text-xl font-bold text-white">
                    {budget.categoryId.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {new Date(budget.startDate).toLocaleDateString("vi-VN")} -{" "}
                    {new Date(budget.endDate).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(budget)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(budget._id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">
                    Đã chi: {(budget.spent || 0).toLocaleString("vi-VN")}₫
                  </span>
                  <span className="text-gray-300">
                    Ngân sách: {budget.amount.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getProgressColor(budget)}`}
                    style={{
                      width: `${Math.min(budget.percentage || 0, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="text-center mt-2">
                  <span
                    className={`text-lg font-bold ${
                      budget.isExceeded
                        ? "text-red-400"
                        : budget.isWarning
                          ? "text-yellow-400"
                          : "text-green-400"
                    }`}
                  >
                    {budget.percentage?.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-300">
                {budget.remaining && budget.remaining > 0 ? (
                  <p>Còn lại: {budget.remaining.toLocaleString("vi-VN")}₫</p>
                ) : (
                  <p className="text-red-400">
                    Vượt:{" "}
                    {Math.abs(budget.remaining || 0).toLocaleString("vi-VN")}₫
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {budgets.length === 0 && (
          <div className="glass p-12 rounded-2xl text-center animate-scaleIn">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 opacity-70">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-xl text-white font-semibold mb-2">
              Chưa có ngân sách nào
            </p>
            <p className="text-gray-400">
              Tạo ngân sách đầu tiên để quản lý chi tiêu!
            </p>
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="glass p-6 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              {editingBudget ? "Sửa Ngân sách" : "Tạo Ngân sách Mới"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Danh mục
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                  disabled={!!editingBudget}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Số tiền ngân sách
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="Nhập số tiền"
                  required
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Ngưỡng cảnh báo
                  </label>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    {formData.warningThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  value={formData.warningThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warningThreshold: e.target.value,
                    })
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  min="0"
                  max="100"
                  step="5"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-info text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient transition-all"
                >
                  {editingBudget ? "Cập nhật" : "Tạo ngân sách"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBudget(null);
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
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
