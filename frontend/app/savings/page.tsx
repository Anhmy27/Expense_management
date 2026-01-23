"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

interface SavingsGoal {
  _id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  withdrawnAmount?: number;
  totalContributed?: number;
  deadline?: string;
  icon: string;
  color: string;
  status: "active" | "completed" | "cancelled";
  percentage?: number;
  remaining?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Wallet {
  _id: string;
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
}

const GOAL_ICONS = [
  "🎯",
  "💰",
  "🏠",
  "🚗",
  "✈️",
  "💍",
  "🎓",
  "🏖️",
  "💻",
  "📱",
  "🎮",
  "🏥",
  "👶",
  "🎉",
  "💎",
  "🌟",
];
const GOAL_COLORS = [
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

export default function SavingsGoalsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "completed"
  >("active");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    deadline: "",
    icon: "🎯",
    color: "#10b981",
  });

  const [contributeData, setContributeData] = useState({
    walletId: "",
    amount: "",
    note: "",
  });
  const [withdrawData, setWithdrawData] = useState({
    walletId: "",
    amount: "",
    note: "",
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
  }, [isAuthenticated, filterStatus]);

  const fetchData = useCallback(
    async (showLoading = true) => {
      try {
        // Chỉ hiển thị loading screen lần đầu tiên load trang
        if (showLoading && !initialLoaded) setLoading(true);
        const token = localStorage.getItem("token");
        const statusParam =
          filterStatus === "all" ? "" : `?status=${filterStatus}`;

        const [goalsRes, walletsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/savings-goals${statusParam}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (goalsRes.ok) setGoals(await goalsRes.json());
        if (walletsRes.ok) setWallets(await walletsRes.json());
      } catch (error) {
        console.error("Error fetching data:", error);
        setToast({ message: "Có lỗi xảy ra khi tải dữ liệu", type: "error" });
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [filterStatus, initialLoaded],
  );

  const handleViewDetail = async (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/savings-goals/${goal._id}/transactions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) setGoalHistory(await response.json());
    } catch (error) {
      console.error("Error fetching goal history:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingGoal
        ? `${process.env.NEXT_PUBLIC_API_URL}/savings-goals/${editingGoal._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/savings-goals`;

      const response = await fetch(url, {
        method: editingGoal ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
        }),
      });

      if (!response.ok) throw new Error((await response.json()).message);

      setToast({
        message: editingGoal
          ? "Cập nhật thành công!"
          : "Tạo mục tiêu thành công!",
        type: "success",
      });
      setShowCreateModal(false);
      setEditingGoal(null);
      setFormData({
        name: "",
        description: "",
        targetAmount: "",
        deadline: "",
        icon: "🎯",
        color: "#10b981",
      });
      fetchData(false);
    } catch (error: any) {
      setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/savings-goals/${selectedGoal._id}/contribute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...contributeData,
            amount: parseFloat(contributeData.amount),
          }),
        },
      );
      if (!response.ok) throw new Error((await response.json()).message);
      setToast({ message: "Đóng góp thành công!", type: "success" });
      setShowContributeModal(false);
      setSelectedGoal(null);
      setContributeData({ walletId: "", amount: "", note: "" });
      fetchData(false);
    } catch (error: any) {
      setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/savings-goals/${selectedGoal._id}/withdraw`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...withdrawData,
            amount: parseFloat(withdrawData.amount),
          }),
        },
      );
      if (!response.ok) throw new Error((await response.json()).message);
      setToast({ message: "Rút tiền thành công!", type: "success" });
      setShowWithdrawModal(false);
      setSelectedGoal(null);
      setWithdrawData({ walletId: "", amount: "", note: "" });
      fetchData(false);
    } catch (error: any) {
      setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
    }
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || "",
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline ? goal.deadline.split("T")[0] : "",
      icon: goal.icon,
      color: goal.color,
    });
    setShowCreateModal(true);
  };

  const handleDelete = (goal: SavingsGoal) => {
    if (goal.currentAmount > 0) {
      setSelectedGoal(goal);
      setWithdrawData({
        walletId: "",
        amount: goal.currentAmount.toString(),
        note: "Rút hết tiền để xóa mục tiêu",
      });
      setConfirmModal({
        title: "Rút tiền trước khi xóa",
        message: `Mục tiêu còn ${formatCurrency(goal.currentAmount)}. Bạn cần rút hết tiền trước.`,
        type: "warning",
        onConfirm: () => {
          setConfirmModal(null);
          setShowWithdrawModal(true);
        },
      });
      return;
    }
    setConfirmModal({
      title: "Xóa mục tiêu",
      message: `Bạn có chắc muốn xóa "${goal.name}"?`,
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/savings-goals/${goal._id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          setToast({ message: "Xóa thành công!", type: "success" });
          setConfirmModal(null);
          fetchData(false);
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

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("vi-VN") + "₫";

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    return Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
  };

  // Tính toán dựa trên filter hiện tại
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const activeGoalsCount = goals.filter((g) => g.status === "active").length;
  const completedGoalsCount = goals.filter(
    (g) => g.status === "completed",
  ).length;

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
            <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <h1 className="text-xl font-bold text-white">Mục Tiêu Tiết Kiệm</h1>
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

      <main className="max-w-7xl mx-auto px-4 py-6 animate-fadeIn">
        {/* Summary Cards - Thay đổi theo filter */}
        <div
          className={`grid grid-cols-1 gap-4 mb-6 ${filterStatus === "all" ? "md:grid-cols-4" : "md:grid-cols-3"}`}
        >
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng đã tiết kiệm</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalSaved)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng mục tiêu</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalTarget)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-info rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Số mục tiêu</p>
                <p className="text-2xl font-bold text-white">{goals.length}</p>
              </div>
            </div>
          </div>
          {/* Chỉ hiển thị thẻ "Đã hoàn thành" khi filter là "Tất cả" */}
          {filterStatus === "all" && (
            <div className="glass p-5 rounded-2xl hover-lift transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-warning rounded-xl flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Đã hoàn thành</p>
                  <p className="text-2xl font-bold text-white">
                    {completedGoalsCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${filterStatus === status ? "gradient-primary text-white" : "glass text-white/70 hover:text-white"}`}
              >
                {status === "all"
                  ? "Tất cả"
                  : status === "active"
                    ? "Đang hoạt động"
                    : "Đã hoàn thành"}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setEditingGoal(null);
              setFormData({
                name: "",
                description: "",
                targetAmount: "",
                deadline: "",
                icon: "🎯",
                color: "#10b981",
              });
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
            Tạo Mục Tiêu
          </button>
        </div>

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Chưa có mục tiêu nào
            </h3>
            <p className="text-gray-400 mb-6">
              Bắt đầu tiết kiệm bằng cách tạo mục tiêu đầu tiên!
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
              Tạo Mục Tiêu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const daysRemaining = getDaysRemaining(goal.deadline);
              return (
                <div
                  key={goal._id}
                  onClick={() => handleViewDetail(goal)}
                  className="glass p-6 rounded-2xl hover-lift transition-all border-l-4 cursor-pointer"
                  style={{ borderLeftColor: goal.color }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: goal.color + "20" }}
                      >
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {goal.name}
                        </h3>
                        {goal.description && (
                          <p className="text-sm text-gray-400">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {goal.status === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(goal);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-all"
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
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(goal);
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-all"
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

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Tiến độ</span>
                      <span className="text-white font-semibold">
                        {goal.percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${goal.percentage || 0}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Đã tiết kiệm:</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mục tiêu:</span>
                      <span className="text-blue-400 font-semibold">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    {goal.status === "active" && goal.remaining && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Còn thiếu:</span>
                        <span className="text-yellow-400 font-semibold">
                          {formatCurrency(goal.remaining)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  {daysRemaining !== null && goal.status === "active" && (
                    <div className="mb-4">
                      <div
                        className={`text-sm px-3 py-2 rounded-lg ${daysRemaining < 0 ? "bg-red-500/20 text-red-400" : daysRemaining < 30 ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}
                      >
                        {daysRemaining < 0
                          ? `Quá hạn ${Math.abs(daysRemaining)} ngày`
                          : `Còn ${daysRemaining} ngày`}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {goal.status === "completed" && (
                    <div className="mb-4 bg-green-500/20 text-green-400 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Đã hoàn thành
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {goal.status === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGoal(goal);
                          setContributeData({
                            walletId: "",
                            amount: "",
                            note: "",
                          });
                          setShowContributeModal(true);
                        }}
                        className="flex-1 gradient-success text-white py-2 px-4 rounded-xl hover-lift btn-gradient font-medium transition-all text-sm"
                      >
                        💰 Đóng góp
                      </button>
                    )}
                    {goal.currentAmount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGoal(goal);
                          setWithdrawData({
                            walletId: "",
                            amount: "",
                            note: "",
                          });
                          setShowWithdrawModal(true);
                        }}
                        className="flex-1 gradient-warning text-white py-2 px-4 rounded-xl hover-lift btn-gradient font-medium transition-all text-sm"
                      >
                        💸 Rút tiền
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-4xl w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: selectedGoal.color + "20" }}
                >
                  {selectedGoal.icon}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {selectedGoal.name}
                  </h2>
                  {selectedGoal.description && (
                    <p className="text-gray-300">{selectedGoal.description}</p>
                  )}
                  {selectedGoal.status === "completed" && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-lg">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Hoàn thành
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedGoal(null);
                  setGoalHistory([]);
                }}
                className="text-white/60 hover:text-white text-2xl hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-purple-600/20 p-4 rounded-xl border border-purple-500/30">
                <div className="text-gray-300 text-sm mb-1">Tổng đóng góp</div>
                <div className="text-purple-400 text-2xl font-bold">
                  {formatCurrency(
                    selectedGoal.totalContributed || selectedGoal.currentAmount,
                  )}
                </div>
              </div>
              <div className="bg-orange-600/20 p-4 rounded-xl border border-orange-500/30">
                <div className="text-gray-300 text-sm mb-1">Đã rút</div>
                <div className="text-orange-400 text-2xl font-bold">
                  {formatCurrency(selectedGoal.withdrawnAmount || 0)}
                </div>
              </div>
              <div className="bg-green-600/20 p-4 rounded-xl border border-green-500/30">
                <div className="text-gray-300 text-sm mb-1">Hiện còn</div>
                <div className="text-green-400 text-2xl font-bold">
                  {formatCurrency(selectedGoal.currentAmount)}
                </div>
              </div>
              <div className="bg-blue-600/20 p-4 rounded-xl border border-blue-500/30">
                <div className="text-gray-300 text-sm mb-1">Mục tiêu</div>
                <div className="text-blue-400 text-2xl font-bold">
                  {formatCurrency(selectedGoal.targetAmount)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Tiến độ</span>
                <span className="text-white font-semibold">
                  {selectedGoal.percentage || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${selectedGoal.percentage || 0}%`,
                    backgroundColor: selectedGoal.color,
                  }}
                />
              </div>
            </div>

            {/* History */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Lịch sử giao dịch ({goalHistory.length})
              </h3>
              {goalHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Chưa có giao dịch nào
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {goalHistory
                    .sort(
                      (a, b) =>
                        new Date(b.transactionDate).getTime() -
                        new Date(a.transactionDate).getTime(),
                    )
                    .map((t, i) => {
                      const isContrib = t.note?.includes("Đóng góp");
                      return (
                        <div
                          key={t._id || i}
                          className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${isContrib ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
                            >
                              {isContrib ? "+" : "-"}
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {isContrib ? "Đóng góp" : "Rút tiền"}
                              </div>
                              <div className="text-sm text-gray-400">
                                {new Date(t.transactionDate).toLocaleDateString(
                                  "vi-VN",
                                )}{" "}
                                • {t.walletId?.name || "Ví"}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`text-lg font-bold ${isContrib ? "text-green-400" : "text-yellow-400"}`}
                          >
                            {isContrib ? "+" : "-"}
                            {formatCurrency(t.amount)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedGoal.status === "active" && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setContributeData({ walletId: "", amount: "", note: "" });
                    setShowContributeModal(true);
                  }}
                  className="flex-1 gradient-success text-white py-3 px-6 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                >
                  💰 Đóng góp thêm
                </button>
                {selectedGoal.currentAmount > 0 && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setWithdrawData({ walletId: "", amount: "", note: "" });
                      setShowWithdrawModal(true);
                    }}
                    className="flex-1 gradient-warning text-white py-3 px-6 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                  >
                    💸 Rút tiền
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-2xl w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              {editingGoal ? "Sửa Mục Tiêu" : "Tạo Mục Tiêu Mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Tên mục tiêu
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  placeholder="VD: Mua xe, Du lịch..."
                  required
                />
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
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Số tiền mục tiêu
                  </label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAmount: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Hạn chót (tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Biểu tượng
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {GOAL_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg transition-all ${formData.icon === icon ? "bg-green-500/30 ring-2 ring-green-500" : "bg-white/5 hover:bg-white/10"}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Màu sắc
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {GOAL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-12 h-12 rounded-lg transition-all ${formData.color === color ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-success text-white py-3 px-4 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                >
                  {editingGoal ? "Cập nhật" : "Tạo mục tiêu"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGoal(null);
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

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-lg w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-2xl">{selectedGoal.icon}</span>
              Đóng góp vào "{selectedGoal.name}"
            </h2>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Chọn ví
                </label>
                <select
                  value={contributeData.walletId}
                  onChange={(e) =>
                    setContributeData({
                      ...contributeData,
                      walletId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">-- Chọn ví --</option>
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.icon} {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Số tiền đóng góp
                </label>
                <input
                  type="number"
                  value={contributeData.amount}
                  onChange={(e) =>
                    setContributeData({
                      ...contributeData,
                      amount: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-700/80 text-white transition-all"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Còn thiếu: {formatCurrency(selectedGoal.remaining || 0)}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-success text-white py-3 px-4 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                >
                  Đóng góp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowContributeModal(false);
                    setSelectedGoal(null);
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

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass max-w-lg w-full rounded-3xl p-8 modal-slide-up shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-2xl">{selectedGoal.icon}</span>
              Rút tiền từ "{selectedGoal.name}"
            </h2>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Chọn ví nhận
                </label>
                <select
                  value={withdrawData.walletId}
                  onChange={(e) =>
                    setWithdrawData({
                      ...withdrawData,
                      walletId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-slate-700/80 text-white transition-all"
                  required
                >
                  <option value="">-- Chọn ví --</option>
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.icon} {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Số tiền rút
                </label>
                <input
                  type="number"
                  value={withdrawData.amount}
                  onChange={(e) =>
                    setWithdrawData({ ...withdrawData, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-slate-700/80 text-white transition-all"
                  min="1"
                  max={selectedGoal.currentAmount}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Số dư hiện tại: {formatCurrency(selectedGoal.currentAmount)}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-warning text-white py-3 px-4 rounded-xl hover-lift btn-gradient font-semibold transition-all"
                >
                  Rút tiền
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedGoal(null);
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
