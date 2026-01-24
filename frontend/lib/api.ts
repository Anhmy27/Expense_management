const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Có lỗi xảy ra" }));
    
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    
    throw new Error(error.message || "Có lỗi xảy ra");
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: User; message: string }>("/auth/login", {
      method: "POST",
      body: data,
    }),

  register: (data: { username: string; password: string }) =>
    request<{ token: string; user: User; message: string }>("/auth/register", {
      method: "POST",
      body: data,
    }),

  // User
  getProfile: () => request<User>("/user/profile"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/user/change-password", {
      method: "PUT",
      body: data,
    }),

  // Categories
  getCategories: (type?: string) =>
    request<Category[]>(`/categories${type ? `?type=${type}` : ""}`),

  createCategory: (data: { name: string; type: "in" | "out" }) =>
    request<Category>("/categories", { method: "POST", body: data }),

  // Transactions
  getTransactions: (params?: TransactionFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.categoryId) searchParams.append("categoryId", params.categoryId);
    if (params?.type) searchParams.append("type", params.type);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    
    const queryString = searchParams.toString();
    return request<TransactionResponse>(`/transactions${queryString ? `?${queryString}` : ""}`);
  },

  createTransaction: (data: CreateTransactionData) =>
    request<Transaction>("/transactions", { method: "POST", body: data }),

  deleteTransaction: (id: string) =>
    request<{ message: string }>(`/transactions/${id}`, { method: "DELETE" }),

  // Statistics
  getStatistics: (params?: { year?: number; period?: "week" | "month"; walletId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append("year", params.year.toString());
    if (params?.period) searchParams.append("period", params.period);
    if (params?.walletId) searchParams.append("walletId", params.walletId);
    const queryString = searchParams.toString();
    return request<StatisticsResponse>(`/statistics${queryString ? `?${queryString}` : ""}`);
  },

  // Wallets
  getWallets: () => request<Wallet[]>("/wallets"),

  // Dashboard - Gộp tất cả API cho homepage
  getDashboard: (params?: TransactionFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.categoryId) searchParams.append("categoryId", params.categoryId);
    if (params?.walletId) searchParams.append("walletId", params.walletId);
    if (params?.type) searchParams.append("type", params.type);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    
    const queryString = searchParams.toString();
    return request<DashboardResponse>(`/dashboard${queryString ? `?${queryString}` : ""}`);
  },

  // Notifications
  getNotifications: () => request<Notification[]>("/notifications"),
  
  getUnreadCount: () => request<{ count: number }>("/notifications/unread-count"),
  
  markAsRead: (id: string) => 
    request<Notification>(`/notifications/${id}/read`, { method: "PUT" }),
  
  markAllAsRead: () => 
    request<{ message: string }>("/notifications/read-all", { method: "PUT" }),
  
  deleteNotification: (id: string) => 
    request<{ message: string }>(`/notifications/${id}`, { method: "DELETE" }),
  
  deleteAllRead: () => 
    request<{ message: string }>("/notifications", { method: "DELETE" }),
};

// Types
export interface User {
  _id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  type: "in" | "out";
}

export interface Wallet {
  _id: string;
  name: string;
  type: "cash" | "bank" | "credit" | "ewallet";
  balance: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  categoryId?: Category;
  categoryName?: string; // Tên danh mục cho giao dịch hệ thống (transfer, savings)
  walletId?: any; // Wallet object hoặc ID
  amount: number;
  note?: string;
  transactionDate: string;
  type?: "normal" | "transfer_out" | "transfer_in";
  transferId?: string;
  relatedWalletId?: any; // Wallet object hoặc ID
  savingsGoalId?: string;
  createdAt: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  walletId?: string;
  type?: "in" | "out";
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTransactionData {
  categoryId: string;
  walletId: string; // Bắt buộc
  amount: number;
  note?: string;
  transactionDate: string;
}

export interface TimeSeriesDataPoint {
  label: string;
  income: number;
  expense: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface StatisticsResponse {
  year: number;
  period: "week" | "month";
  timeSeriesData: TimeSeriesDataPoint[];
  categoryIncomeData: CategoryDataPoint[];
  categoryExpenseData: CategoryDataPoint[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
}

export interface Budget {
  _id: string;
  categoryId: Category;
  amount: number;
  spent: number;
  percentage: number;
  remaining: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface DashboardResponse {
  user: User;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: Category[];
  budgetAlerts: Budget[];
  wallets: Wallet[];
}

export interface Notification {
  _id: string;
  userId: string;
  type: "BUDGET_WARNING" | "BUDGET_EXCEEDED" | "SAVINGS_MILESTONE" | "SAVINGS_COMPLETED" | "DEADLINE_REMINDER";
  title: string;
  message: string;
  relatedId: string;
  relatedType: "budget" | "savingsGoal";
  data: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
