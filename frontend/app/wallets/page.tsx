"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

interface Wallet {
  _id: string;
  name: string;
  type: "cash" | "bank" | "credit" | "ewallet";
  balance: number;
  currency: string;
  icon: string;
  color: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const WALLET_TYPES = [
  { value: "cash", label: "Tiền mặt", icon: "💵" },
  { value: "bank", label: "Ngân hàng", icon: "🏦" },
  { value: "credit", label: "Thẻ tín dụng", icon: "💳" },
  { value: "ewallet", label: "Ví điện tử", icon: "📱" },
];

const WALLET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

export default function WalletsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    type: "cash" as "cash" | "bank" | "credit" | "ewallet",
    balance: "",
    icon: "💰",
    color: "#6366f1",
    description: "",
  });

  const [transferData, setTransferData] = useState({
    fromWalletId: "",
    toWalletId: "",
    amount: "",
    note: "",
  });

  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalWallets: 0,
    walletsByType: {} as any,
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
      const [walletsRes, summaryRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallets/summary/total`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (walletsRes.ok) {
        const walletsData = await walletsRes.json();
        setWallets(walletsData);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
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
      const url = editingWallet
        ? `${process.env.NEXT_PUBLIC_API_URL}/wallets/${editingWallet._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/wallets`;

      const response = await fetch(url, {
        method: editingWallet ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance) || 0,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingWallet(null);
        setFormData({
          name: "",
          type: "cash",
          balance: "",
          icon: "💰",
          color: "#6366f1",
          description: "",
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
      title: "Xóa ví",
      message:
        "Bạn có chắc muốn xóa ví này? Tất cả dữ liệu liên quan sẽ bị mất.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/wallets/${id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (response.ok) {
            setToast({ message: "Đã xóa ví thành công!", type: "success" });
            fetchData();
          }
        } catch (error) {
          console.error("Error:", error);
          setToast({ message: "Có lỗi xảy ra", type: "error" });
        }
      },
    });
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallets/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...transferData,
            amount: parseFloat(transferData.amount),
          }),
        },
      );

      if (response.ok) {
        setShowTransferModal(false);
        setTransferData({
          fromWalletId: "",
          toWalletId: "",
          amount: "",
          note: "",
        });
        fetchData();
        setToast({ message: "Chuyển tiền thành công!", type: "success" });
      } else {
        const error = await response.json();
        setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
      }
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "Có lỗi xảy ra", type: "error" });
    }
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance.toString(),
      icon: wallet.icon,
      color: wallet.color,
      description: wallet.description || "",
    });
    setShowCreateModal(true);
  };

  const handleViewTransactions = async (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setShowTransactionsModal(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions?walletId=${wallet._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setWalletTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setWalletTransactions([]);
    }
  };

  const getWalletTypeLabel = (type: string) => {
    return WALLET_TYPES.find((t) => t.value === type)?.label || type;
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Quản lý Ví</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTransferModal(true)}
              className="gradient-success text-white px-4 py-2 rounded-xl hover-lift btn-gradient font-medium transition-all flex items-center gap-2"
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Chuyển tiền
            </button>
            <button
              onClick={() => {
                setEditingWallet(null);
                setFormData({
                  name: "",
                  type: "cash",
                  balance: "",
                  icon: "💰",
                  color: "#6366f1",
                  description: "",
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
              Tạo Ví
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng số dư</p>
                <p className="text-2xl font-bold text-white">
                  {summary.totalBalance.toLocaleString("vi-VN")}₫
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 gradient-info rounded-xl flex items-center justify-center">
                <span className="text-xl">🏦</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Số lượng ví</p>
                <p className="text-2xl font-bold text-white">
                  {summary.totalWallets} ví
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Loại ví</p>
                <p className="text-sm text-white">
                  {Object.keys(summary.walletsByType).length} loại khác nhau
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wallets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <div
              key={wallet._id}
              onClick={() => handleViewTransactions(wallet)}
              className="glass p-6 rounded-2xl hover-lift transition-all cursor-pointer hover:scale-105"
              style={{ borderLeft: `4px solid ${wallet.color}` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${wallet.color}20` }}
                  >
                    {wallet.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {wallet.name}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {getWalletTypeLabel(wallet.type)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(wallet);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(wallet._id);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-300 mb-1">Số dư</p>
                <p className="text-2xl font-bold text-white">
                  {wallet.balance.toLocaleString("vi-VN")}₫
                </p>
              </div>

              {wallet.description && (
                <p className="text-sm text-gray-300 mt-2">
                  {wallet.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {wallets.length === 0 && (
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <p className="text-xl text-white font-semibold mb-2">
              Chưa có ví nào
            </p>
            <p className="text-gray-400">
              Tạo ví đầu tiên để quản lý tài chính!
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
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              {editingWallet ? "Sửa Ví" : "Tạo Ví Mới"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Tên ví
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="VD: Ví tiền mặt, Tài khoản Vietcombank"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Loại ví
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as any,
                      icon:
                        WALLET_TYPES.find((t) => t.value === e.target.value)
                          ?.icon || "💰",
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  {WALLET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Số dư ban đầu
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Màu sắc
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WALLET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color
                          ? "ring-2 ring-white scale-110"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  rows={2}
                  placeholder="Ghi chú về ví này..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-info text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient transition-all"
                >
                  {editingWallet ? "Cập nhật" : "Tạo ví"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingWallet(null);
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

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn p-4">
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
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              Chuyển tiền giữa ví
            </h2>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Từ ví
                </label>
                <select
                  value={transferData.fromWalletId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      fromWalletId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">Chọn ví nguồn</option>
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
                  Đến ví
                </label>
                <select
                  value={transferData.toWalletId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      toWalletId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">Chọn ví đích</option>
                  {wallets
                    .filter((w) => w._id !== transferData.fromWalletId)
                    .map((wallet) => (
                      <option key={wallet._id} value={wallet._id}>
                        {wallet.icon} {wallet.name}
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
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="Nhập số tiền"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  value={transferData.note}
                  onChange={(e) =>
                    setTransferData({ ...transferData, note: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700/80 text-white transition-all"
                  placeholder="Lý do chuyển tiền..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-success text-white py-3 px-4 rounded-xl font-semibold hover-lift btn-gradient transition-all"
                >
                  Chuyển tiền
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-500 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-4xl w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Giao dịch - {selectedWallet.icon} {selectedWallet.name}
                </h2>
                <p className="text-gray-300">
                  {getWalletTypeLabel(selectedWallet.type)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedWallet(null);
                  setWalletTransactions([]);
                }}
                className="text-white/60 hover:text-white text-2xl hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Wallet Summary */}
            <div
              className="bg-gradient-to-br from-slate-700 to-slate-600 p-6 rounded-xl border border-white/20 mb-6"
              style={{
                borderLeftColor: selectedWallet.color,
                borderLeftWidth: "4px",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-200 text-sm mb-1">
                    Số dư hiện tại
                  </div>
                  <div className="text-white text-3xl font-bold">
                    {selectedWallet.balance.toLocaleString("vi-VN")}₫
                  </div>
                </div>
                <div className="text-5xl opacity-50">{selectedWallet.icon}</div>
              </div>
              {selectedWallet.description && (
                <p className="text-gray-300 text-sm mt-3">
                  {selectedWallet.description}
                </p>
              )}
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {walletTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">📭</div>
                  <p>Chưa có giao dịch nào cho ví này</p>
                </div>
              ) : (
                walletTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`text-2xl ${
                              transaction.type === "transfer_out"
                                ? "text-blue-400"
                                : transaction.type === "transfer_in"
                                  ? "text-blue-400"
                                  : transaction.categoryId?.type === "in"
                                    ? "text-green-400"
                                    : "text-red-400"
                            }`}
                          >
                            {transaction.type === "transfer_out"
                              ? "→"
                              : transaction.type === "transfer_in"
                                ? "←"
                                : transaction.categoryId?.type === "in"
                                  ? "↑"
                                  : "↓"}
                          </span>
                          <div>
                            <div className="text-white font-semibold">
                              {transaction.categoryId?.name || "N/A"}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(
                                transaction.transactionDate,
                              ).toLocaleDateString("vi-VN")}
                            </div>
                          </div>
                        </div>
                        {transaction.note && (
                          <p className="text-gray-300 text-sm ml-11">
                            {transaction.note}
                          </p>
                        )}
                        {/* Hiển thị ví liên quan cho giao dịch chuyển khoản */}
                        {(transaction.type === "transfer_out" ||
                          transaction.type === "transfer_in") &&
                          transaction.relatedWalletId && (
                            <div className="text-blue-400 text-xs ml-11 mt-1">
                              {transaction.type === "transfer_out"
                                ? "→ "
                                : "← "}
                              {transaction.relatedWalletId.icon}{" "}
                              {transaction.relatedWalletId.name}
                            </div>
                          )}
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          transaction.type === "transfer_out"
                            ? "text-red-400"
                            : transaction.type === "transfer_in"
                              ? "text-green-400"
                              : transaction.categoryId?.type === "in"
                                ? "text-green-400"
                                : "text-red-400"
                        }`}
                      >
                        {transaction.type === "transfer_in" ||
                        transaction.categoryId?.type === "in"
                          ? "+"
                          : "-"}
                        {transaction.amount.toLocaleString("vi-VN")}₫
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowTransactionsModal(false);
                setSelectedWallet(null);
                setWalletTransactions([]);
              }}
              className="w-full mt-6 gradient-primary text-white py-3 px-4 rounded-xl font-semibold hover-lift transition-all"
            >
              Đóng
            </button>
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
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}
    </div>
  );
}
