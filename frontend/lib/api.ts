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
  getStatistics: (params?: { year?: number; period?: "week" | "month" }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append("year", params.year.toString());
    if (params?.period) searchParams.append("period", params.period);
    const queryString = searchParams.toString();
    return request<StatisticsResponse>(`/statistics${queryString ? `?${queryString}` : ""}`);
  },
};

// Types
export interface User {
  _id: string;
  username: string;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  type: "in" | "out";
}

export interface Transaction {
  _id: string;
  userId: string;
  categoryId: Category;
  amount: number;
  note?: string;
  transactionDate: string;
  createdAt: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: "in" | "out";
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
