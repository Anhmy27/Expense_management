"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
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
  const [loading, setLoading] = useState(true);
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

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    categoryId: "",
    amount: "",
    note: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  // New category form
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "out" as "in" | "out",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, transRes, catRes] = await Promise.all([
        api.getProfile(),
        api.getTransactions(filters),
        api.getCategories(),
      ]);
      setUser(userRes);
      setTransactions(transRes.transactions);
      setPagination(transRes.pagination);
      setCategories(catRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        categoryId: newTransaction.categoryId,
        amount: parseFloat(newTransaction.amount),
        note: newTransaction.note,
        transactionDate: newTransaction.transactionDate,
      });
      setShowCreateModal(false);
      setNewTransaction({
        categoryId: "",
        amount: "",
        note: "",
        transactionDate: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
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
    if (!confirm("Bạn có chắc muốn xóa giao dịch này?")) return;
    try {
      await api.deleteTransaction(id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-400">
          Đang tải...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Quản lý chi tiêu
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">
              Số dư:{" "}
              <span
                className={`font-bold ${
                  (user?.currentBalance || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(user?.currentBalance || 0)}
              </span>
            </span>
            <Link
              href="/statistics"
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Thống kê
            </Link>
            <Link
              href="/profile"
              className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white transition-colors"
            >
              Tài khoản
            </Link>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Thêm giao dịch
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            + Thêm danh mục
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            Bộ lọc
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Tất cả</option>
                <option value="in">Thu</option>
                <option value="out">Chi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Danh mục
              </label>
              <select
                value={filters.categoryId || ""}
                onChange={(e) =>
                  handleFilterChange("categoryId", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name} ({cat.type === "in" ? "Thu" : "Chi"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ngày
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ghi chú
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(transaction.transactionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.categoryId?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          transaction.categoryId?.type === "in"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {transaction.categoryId?.type === "in" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.categoryId?.type === "in"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.categoryId?.type === "in" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {transaction.note || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteTransaction(transaction._id)}
                        className="text-red-600 hover:text-red-800"
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
            <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-700 dark:text-gray-300">
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
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white"
                >
                  Trước
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) + 1,
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Transaction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Thêm giao dịch mới
            </h2>
            <form onSubmit={handleCreateTransaction}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="1"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Thêm danh mục mới
            </h2>
            <form onSubmit={handleCreateCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Loại
                </label>
                <select
                  value={newCategory.type}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      type: e.target.value as "in" | "out",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="in">Thu</option>
                  <option value="out">Chi</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
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
