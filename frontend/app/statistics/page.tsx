"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import {
  api,
  StatisticsResponse,
  TimeSeriesDataPoint,
  CategoryDataPoint,
} from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#A4DE6C",
  "#D0ED57",
];

export default function StatisticsPage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // Loading khi thay đổi filter
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState<"week" | "month">("month");

  const fetchStatistics = useCallback(async () => {
    try {
      const isInitialLoad = !statistics;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setFetching(true);
      }

      const data = await api.getStatistics({ year, period });
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [year, period, statistics]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
    }
  }, [isAuthenticated, fetchStatistics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatTooltipValue = (value: number | string | undefined): string => {
    if (typeof value === "number") {
      return formatCurrency(value);
    }
    return String(value || 0);
  };

  // Generate year options (last 5 years)
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-xl text-white/80">Đang tải thống kê...</div>
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Thống kê thu chi</h1>
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

        {/* Filters */}
        <div
          className={`glass p-5 rounded-2xl mb-6 relative transition-opacity duration-200 ${fetching ? "opacity-60" : "opacity-100"}`}
        >
          {fetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10 rounded-2xl">
              <div className="spinner"></div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Năm
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-gray-800">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Thống kê theo
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "week" | "month")}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all hover:bg-white/15"
              >
                <option value="month" className="bg-gray-800">
                  Tháng
                </option>
                <option value="week" className="bg-gray-800">
                  Tuần
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass p-5 rounded-2xl hover-lift transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 gradient-success rounded-xl flex items-center justify-center">
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
                      d="M7 11l5-5m0 0l5 5m-5-5v12"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white/70">Tổng thu</h3>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(statistics.summary.totalIncome)}
              </p>
            </div>
            <div className="glass p-5 rounded-2xl hover-lift transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 gradient-danger rounded-xl flex items-center justify-center">
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
                      d="M17 13l-5 5m0 0l-5-5m5 5V6"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white/70">Tổng chi</h3>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(statistics.summary.totalExpense)}
              </p>
            </div>
            <div className="glass p-5 rounded-2xl hover-lift transition-all">
              <div className="flex items-center gap-3 mb-2">
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
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white/70">Cân đối</h3>
              </div>
              <p
                className={`text-2xl font-bold ${
                  statistics.summary.balance >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(statistics.summary.balance)}
              </p>
            </div>
          </div>
        )}

        {/* Line Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Income Line Chart */}
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-4">
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Biểu đồ thu nhập theo {period === "month" ? "tháng" : "tuần"}
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics?.timeSeriesData || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.7)" }}
                    interval={period === "week" ? 3 : 0}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                      }).format(value)
                    }
                    tick={{ fill: "rgba(255,255,255,0.7)" }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <Tooltip
                    formatter={formatTooltipValue}
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "none",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "white" }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22C55E"
                    strokeWidth={3}
                    name="Thu nhập"
                    dot={{ fill: "#22C55E", strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Line Chart */}
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 gradient-danger rounded-lg flex items-center justify-center">
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
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Biểu đồ chi tiêu theo {period === "month" ? "tháng" : "tuần"}
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics?.timeSeriesData || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.7)" }}
                    interval={period === "week" ? 3 : 0}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                      }).format(value)
                    }
                    tick={{ fill: "rgba(255,255,255,0.7)" }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <Tooltip
                    formatter={formatTooltipValue}
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "none",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "white" }} />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={3}
                    name="Chi tiêu"
                    dot={{ fill: "#EF4444", strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Category */}
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-4">
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
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Thu nhập theo danh mục
              </h2>
            </div>
            <div className="h-80">
              {statistics?.categoryIncomeData &&
              statistics.categoryIncomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.categoryIncomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statistics.categoryIncomeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatTooltipValue}
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "none",
                        borderRadius: "12px",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50">
                  Không có dữ liệu thu nhập
                </div>
              )}
            </div>
          </div>

          {/* Expense by Category */}
          <div className="glass p-5 rounded-2xl hover-lift transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 gradient-danger rounded-lg flex items-center justify-center">
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
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Chi tiêu theo danh mục
              </h2>
            </div>
            <div className="h-80">
              {statistics?.categoryExpenseData &&
              statistics.categoryExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.categoryExpenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statistics.categoryExpenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatTooltipValue}
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "none",
                        borderRadius: "12px",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50">
                  Không có dữ liệu chi tiêu
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
