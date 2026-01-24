"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  api,
  Transaction,
  Category,
  TransactionFilters,
  User,
} from "@/lib/api";

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // Loading khi filter
  const [error, setError] = useState("");

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // Toast and Confirm states
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

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    categoryId: "",
    walletId: "",
    amount: "",
    note: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // New category form
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "out" as "in" | "out",
  });

  // Debounce timer for date inputs
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const isInitialLoad = transactions.length === 0;
      if (isInitialLoad) {
        setLoading(true);
        // Initial load: Dùng Dashboard API - gộp 5 requests thành 1
        const dashboardData = await api.getDashboard(filters);

        setUser(dashboardData.user);
        setTransactions(dashboardData.transactions);
        setPagination(dashboardData.pagination);
        setCategories(dashboardData.categories);
        setBudgetAlerts(dashboardData.budgetAlerts);
        setWallets(dashboardData.wallets);
      } else {
        setFetching(true);
        // Filter changes: Chỉ fetch transactions (categories, wallets không đổi)
        const transRes = await api.getTransactions(filters);
        setTransactions(transRes.transactions);
        setPagination(transRes.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [filters, transactions.length]);

  useEffect(() => {
    if (isAuthenticated) {
      // Debounce 500ms cho tất cả filter changes
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        fetchData();
      }, 300);

      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }
  }, [isAuthenticated, fetchData]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        categoryId: newTransaction.categoryId,
        walletId: newTransaction.walletId,
        amount: parseFloat(newTransaction.amount),
        note: newTransaction.note,
        transactionDate: newTransaction.transactionDate,
      });
      setShowCreateModal(false);
      setNewTransaction({
        categoryId: "",
        walletId: "",
        amount: "",
        note: "",
        transactionDate: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const handleViewTransactionDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory(newCategory);
      const catRes = await api.getCategories();
      setCategories(catRes);
      setShowCategoryModal(false);
      setNewCategory({ name: "", type: "out" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setConfirmModal({
      title: "Xóa giao dịch",
      message:
        "Bạn có chắc muốn xóa giao dịch này? Hành động này không thể hoàn tác.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        setShowDetailModal(false); // Đóng modal chi tiết trước khi xóa
        try {
          await api.deleteTransaction(id);
          setToast({
            message: "Đã xóa giao dịch thành công!",
            type: "success",
          });
          fetchData();
        } catch (err) {
          setToast({
            message:
              err instanceof Error
                ? err.message
                : "Có lỗi xảy ra khi xóa giao dịch",
            type: "error",
          });
        }
      },
    });
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
      page: 1,
    };

    // Nếu thay đổi type, reset categoryId nếu không khớp
    if (key === "type" && filters.categoryId) {
      const selectedCategory = categories.find(
        (cat) => cat._id === filters.categoryId,
      );
      if (selectedCategory && value && selectedCategory.type !== value) {
        newFilters.categoryId = undefined;
      }
    }

    setFilters(newFilters);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-xl text-white/80">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Quản lý chi tiêu</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass px-4 py-2 rounded-xl">
              <span className="text-white/70 text-sm">Tổng số dư: </span>
              <span
                className={`font-bold ${
                  wallets.reduce((sum, w) => sum + w.balance, 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(wallets.reduce((sum, w) => sum + w.balance, 0))}
              </span>
            </div>
            <Link
              href="/statistics"
              className="gradient-primary text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all"
            >
              📊 Thống kê
            </Link>
            <Link
              href="/budgets"
              className="gradient-success text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all"
            >
              💰 Ngân sách
            </Link>
            <Link
              href="/wallets"
              className="gradient-info text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all"
            >
              👛 Ví
            </Link>
            <Link
              href="/savings"
              className="gradient-warning text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all"
            >
              🎯 Tiết kiệm
            </Link>
            <Link
              href="/profile"
              className="glass text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all"
            >
              👤 Tài khoản
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

      <main className="max-w-7xl mx-auto px-4 py-6 animate-fadeIn">
        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {budgetAlerts.map((budget) => (
              <div
                key={budget._id}
                className={`glass border ${
                  budget.isExceeded
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-yellow-500/50 bg-yellow-500/10"
                } px-4 py-3 rounded-xl animate-scaleIn`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {budget.isExceeded ? "🚨" : "⚠️"}
                    </span>
                    <div>
                      <p
                        className={`font-semibold ${
                          budget.isExceeded ? "text-red-400" : "text-yellow-400"
                        }`}
                      >
                        {budget.isExceeded
                          ? "Vượt ngân sách!"
                          : "Cảnh báo ngân sách"}
                      </p>
                      <p className="text-sm text-gray-300">
                        <strong>{budget.categoryId.name}</strong>: Đã chi{" "}
                        {budget.spent.toLocaleString("vi-VN")}₫ /{" "}
                        {budget.amount.toLocaleString("vi-VN")}₫ (
                        {budget.percentage}%)
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/budgets"
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-4 animate-scaleIn">
            <div className="flex items-center justify-between">
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
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-300 font-bold text-xl"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="gradient-info text-white px-6 py-3 rounded-xl hover-lift btn-gradient font-semibold transition-all flex items-center gap-2"
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Thêm giao dịch
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="gradient-success text-white px-6 py-3 rounded-xl hover-lift btn-gradient font-semibold transition-all flex items-center gap-2"
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Thêm danh mục
          </button>
        </div>

        {/* Filters */}
        <div className="glass p-5 rounded-2xl mb-6 hover-scale transition-all">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
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
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Bộ lọc
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Loại
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "type",
                    e.target.value as "in" | "out" | "",
                  )
                }
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              >
                <option value="" className="bg-gray-800">
                  Tất cả
                </option>
                <option value="in" className="bg-gray-800">
                  Thu
                </option>
                <option value="out" className="bg-gray-800">
                  Chi
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Danh mục
              </label>
              <select
                value={filters.categoryId || ""}
                onChange={(e) =>
                  handleFilterChange("categoryId", e.target.value)
                }
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              >
                <option value="" className="bg-gray-800">
                  Tất cả
                </option>
                {categories
                  .filter((cat) => !filters.type || cat.type === filters.type)
                  .map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="bg-gray-800"
                    >
                      {cat.name} ({cat.type === "in" ? "Thu" : "Chi"})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div
          className={`glass rounded-2xl overflow-hidden relative transition-opacity duration-200 ${fetching ? "opacity-60" : "opacity-100"}`}
        >
          {fetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10 rounded-2xl">
              <div className="spinner"></div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Ngày
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Ghi chú
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-white/50"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-12 h-12 text-white/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      Chưa có giao dịch nào
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr
                    key={transaction._id}
                    onClick={() => handleViewTransactionDetail(transaction)}
                    className="table-row-hover hover:bg-white/5 cursor-pointer"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(transaction.transactionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {transaction.categoryId?.name ||
                        transaction.categoryName ||
                        "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          transaction.type === "transfer_in" ||
                          transaction.categoryId?.type === "in" ||
                          transaction.categoryName === "Rút tiết kiệm"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {transaction.type === "transfer_in" ||
                        transaction.categoryId?.type === "in" ||
                        transaction.categoryName === "Rút tiết kiệm"
                          ? "↑ Thu"
                          : "↓ Chi"}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                        transaction.type === "transfer_in" ||
                        transaction.categoryId?.type === "in" ||
                        transaction.categoryName === "Rút tiết kiệm"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.type === "transfer_in" ||
                      transaction.categoryId?.type === "in" ||
                      transaction.categoryName === "Rút tiết kiệm"
                        ? "+"
                        : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60 max-w-xs truncate">
                      {transaction.note || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn trigger onClick của row
                          handleDeleteTransaction(transaction._id);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-3 py-1 rounded-lg transition-all"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 flex justify-between items-center border-t border-white/10">
              <span className="text-sm text-white/70">
                Trang {pagination.page} / {pagination.totalPages} (
                {pagination.total} giao dịch)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) - 1,
                    }))
                  }
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 glass rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 text-white transition-all"
                >
                  ← Trước
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) + 1,
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 glass rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 text-white transition-all"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Transaction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
          <div className="glass p-6 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <div className="w-8 h-8 gradient-info rounded-lg flex items-center justify-center">
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              Thêm giao dịch mới
            </h2>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Danh mục
                </label>
                <select
                  value={newTransaction.categoryId}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name} ({cat.type === "in" ? "Thu" : "Chi"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Ví
                </label>
                <select
                  value={newTransaction.walletId}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      walletId: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">Chọn ví</option>
                  {wallets.map((wallet) => (
                    <option key={wallet._id} value={wallet._id}>
                      {wallet.icon} {wallet.name} (
                      {wallet.balance.toLocaleString("vi-VN")}₫)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Số tiền
                </label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  min="1"
                  placeholder="Nhập số tiền"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Ngày giao dịch
                </label>
                <input
                  type="date"
                  value={newTransaction.transactionDate}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      transactionDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={newTransaction.note}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  rows={3}
                  placeholder="Nhập ghi chú (tùy chọn)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-info text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient transition-all"
                >
                  Thêm giao dịch
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-500 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
          <div className="glass p-6 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <div className="w-8 h-8 gradient-success rounded-lg flex items-center justify-center">
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              Thêm danh mục mới
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Tên danh mục
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  placeholder="Ví dụ: Ăn uống, Lương..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Loại
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewCategory((prev) => ({ ...prev, type: "in" }))
                    }
                    className={`py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      newCategory.type === "in"
                        ? "gradient-success text-white"
                        : "bg-slate-600 text-gray-200 hover:bg-slate-500"
                    }`}
                  >
                    <span>↑</span> Thu nhập
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewCategory((prev) => ({ ...prev, type: "out" }))
                    }
                    className={`py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      newCategory.type === "out"
                        ? "gradient-danger text-white"
                        : "bg-slate-600 text-gray-200 hover:bg-slate-500"
                    }`}
                  >
                    <span>↓</span> Chi tiêu
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-success text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient transition-all"
                >
                  Thêm danh mục
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-500 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Giao Dịch */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-md w-full rounded-3xl modal-slide-up shadow-2xl border border-white/10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4">
              <h2 className="text-2xl font-bold text-white">
                Chi tiết giao dịch
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white/60 hover:text-white text-2xl hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 pb-6 overflow-y-auto">
              {(() => {
                // Helper để check xem có phải giao dịch thu không
                const isIncome =
                  selectedTransaction.type === "transfer_in" ||
                  selectedTransaction.categoryId?.type === "in" ||
                  selectedTransaction.categoryName === "Rút tiết kiệm";

                return (
                  <>
                    {/* Ngày giao dịch */}
                    <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 shadow-lg">
                      <div className="text-gray-200 text-sm mb-1 font-medium">
                        Ngày giao dịch
                      </div>
                      <div className="text-white text-lg font-semibold">
                        {formatDate(selectedTransaction.transactionDate)}
                      </div>
                    </div>

                    {/* Danh mục */}
                    <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 shadow-lg">
                      <div className="text-gray-200 text-sm mb-1 font-medium">
                        Danh mục
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            isIncome
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {isIncome ? "↑ Thu" : "↓ Chi"}
                        </span>
                        <span className="text-white text-lg font-semibold">
                          {selectedTransaction.categoryId?.name ||
                            selectedTransaction.categoryName ||
                            "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Số tiền */}
                    <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 shadow-lg">
                      <div className="text-gray-200 text-sm mb-1 font-medium">
                        Số tiền
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          isIncome ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(selectedTransaction.amount)}
                      </div>
                    </div>

                    {/* Thông tin ví */}
                    {selectedTransaction.type === "normal" &&
                      selectedTransaction.walletId && (
                        <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 shadow-lg">
                          <div className="text-gray-200 text-sm mb-1 font-medium">
                            {isIncome ? "Vào ví" : "Từ ví"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {(selectedTransaction.walletId as any)?.icon ||
                                "💰"}
                            </span>
                            <div>
                              <div className="text-white font-semibold">
                                {(selectedTransaction.walletId as any)?.name ||
                                  "N/A"}
                              </div>
                              <div className="text-white/60 text-xs">
                                {(selectedTransaction.walletId as any)?.type ===
                                "cash"
                                  ? "Tiền mặt"
                                  : (selectedTransaction.walletId as any)
                                        ?.type === "bank"
                                    ? "Ngân hàng"
                                    : (selectedTransaction.walletId as any)
                                          ?.type === "credit"
                                      ? "Thẻ tín dụng"
                                      : "Ví điện tử"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Thông tin chuyển ví */}
                    {(selectedTransaction.type === "transfer_out" ||
                      selectedTransaction.type === "transfer_in") && (
                      <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border-2 border-blue-400/60 shadow-lg">
                        <div className="text-blue-400 text-sm mb-3 font-semibold flex items-center gap-2">
                          <span>🔄</span> Giao dịch chuyển ví
                        </div>

                        <div className="space-y-3">
                          {/* Ví hiện tại */}
                          <div>
                            <div className="text-gray-200 text-xs mb-1 font-medium">
                              {selectedTransaction.type === "transfer_out"
                                ? "Từ ví"
                                : "Đến ví"}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {(selectedTransaction.walletId as any)?.icon ||
                                  "💰"}
                              </span>
                              <div>
                                <div className="text-white font-semibold">
                                  {(selectedTransaction.walletId as any)
                                    ?.name || "N/A"}
                                </div>
                                <div className="text-white/60 text-xs">
                                  {(selectedTransaction.walletId as any)
                                    ?.type === "cash"
                                    ? "Tiền mặt"
                                    : (selectedTransaction.walletId as any)
                                          ?.type === "bank"
                                      ? "Ngân hàng"
                                      : (selectedTransaction.walletId as any)
                                            ?.type === "credit"
                                        ? "Thẻ tín dụng"
                                        : "Ví điện tử"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mũi tên */}
                          <div className="text-center text-white/40">
                            {selectedTransaction.type === "transfer_out"
                              ? "→"
                              : "←"}
                          </div>

                          {/* Ví liên quan */}
                          {selectedTransaction.relatedWalletId && (
                            <div>
                              <div className="text-gray-200 text-xs mb-1 font-medium">
                                {selectedTransaction.type === "transfer_out"
                                  ? "Đến ví"
                                  : "Từ ví"}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">
                                  {(selectedTransaction.relatedWalletId as any)
                                    ?.icon || "💰"}
                                </span>
                                <div>
                                  <div className="text-white font-semibold">
                                    {(
                                      selectedTransaction.relatedWalletId as any
                                    )?.name || "N/A"}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    {(
                                      selectedTransaction.relatedWalletId as any
                                    )?.type === "cash"
                                      ? "Tiền mặt"
                                      : (
                                            selectedTransaction.relatedWalletId as any
                                          )?.type === "bank"
                                        ? "Ngân hàng"
                                        : (
                                              selectedTransaction.relatedWalletId as any
                                            )?.type === "credit"
                                          ? "Thẻ tín dụng"
                                          : "Ví điện tử"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ghi chú */}
                    {selectedTransaction.note && (
                      <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 shadow-lg">
                        <div className="text-gray-200 text-sm mb-1 font-medium">
                          Ghi chú
                        </div>
                        <div className="text-white">
                          {selectedTransaction.note}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-6 pt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full gradient-primary text-white py-3 px-4 rounded-xl font-semibold hover-lift transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}
    </div>
  );
}
