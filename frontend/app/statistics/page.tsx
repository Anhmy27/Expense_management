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
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState<"week" | "month">("month");

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStatistics({ year, period });
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [year, period]);

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

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // Generate year options (last 5 years)
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

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
            Thống kê thu chi
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Trang chủ
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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Năm
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Thống kê theo
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "week" | "month")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="month">Tháng</option>
                <option value="week">Tuần</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng thu
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.summary.totalIncome)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng chi
              </h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(statistics.summary.totalExpense)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Cân đối
              </h3>
              <p
                className={`text-2xl font-bold ${
                  statistics.summary.balance >= 0
                    ? "text-green-600"
                    : "text-red-600"
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Biểu đồ thu nhập theo {period === "month" ? "tháng" : "tuần"}
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics?.timeSeriesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={period === "week" ? 3 : 0}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                      }).format(value)
                    }
                  />
                  <Tooltip formatter={formatTooltipValue} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22C55E"
                    strokeWidth={2}
                    name="Thu nhập"
                    dot={{ fill: "#22C55E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Line Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Biểu đồ chi tiêu theo {period === "month" ? "tháng" : "tuần"}
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics?.timeSeriesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={period === "week" ? 3 : 0}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                      }).format(value)
                    }
                  />
                  <Tooltip formatter={formatTooltipValue} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Chi tiêu"
                    dot={{ fill: "#EF4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Category */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Thu nhập theo danh mục
            </h2>
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
                        `${name} (${(percent * 100).toFixed(0)}%)`
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
                    <Tooltip formatter={formatTooltipValue} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Không có dữ liệu thu nhập
                </div>
              )}
            </div>
          </div>

          {/* Expense by Category */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Chi tiêu theo danh mục
            </h2>
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
                        `${name} (${(percent * 100).toFixed(0)}%)`
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
                    <Tooltip formatter={formatTooltipValue} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
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
