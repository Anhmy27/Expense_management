import express from "express";
import Transaction from "../models/Transaction.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy thống kê theo tuần hoặc tháng trong năm
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { year, period = "month", walletId } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    // Thời gian bắt đầu và kết thúc của năm
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    // Query filter cho giao dịch
    const transactionFilter = {
      userId: req.user.userId,
      transactionDate: { $gte: startOfYear, $lte: endOfYear },
    };

    // Nếu có walletId, lọc theo ví
    if (walletId) {
      transactionFilter.walletId = walletId;
    }

    // Lấy tất cả giao dịch trong năm
    const transactions = await Transaction.find(transactionFilter).populate("categoryId", "name type");

    let timeSeriesData = [];
    let categoryIncomeData = [];
    let categoryExpenseData = [];

    if (period === "week") {
      // Thống kê theo tuần (52 tuần trong năm)
      const weeklyData = {};

      // Khởi tạo 52 tuần
      for (let week = 1; week <= 52; week++) {
        weeklyData[week] = { week, income: 0, expense: 0 };
      }

      // Tính toán số tuần cho mỗi giao dịch
      transactions.forEach((t) => {
        const date = new Date(t.transactionDate);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);

        if (week >= 1 && week <= 52 && weeklyData[week]) {
          if (t.categoryId?.type === "in") {
            weeklyData[week].income += t.amount;
          } else {
            weeklyData[week].expense += t.amount;
          }
        }
      });

      timeSeriesData = Object.values(weeklyData).map((d) => ({
        label: `Tuần ${d.week}`,
        income: d.income,
        expense: d.expense,
      }));
    } else {
      // Thống kê theo tháng (mặc định)
      const monthlyData = {};
      const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
        "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
        "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
      ];

      // Khởi tạo 12 tháng
      for (let month = 0; month < 12; month++) {
        monthlyData[month] = { month, income: 0, expense: 0 };
      }

      transactions.forEach((t) => {
        const month = new Date(t.transactionDate).getMonth();
        if (t.categoryId?.type === "in") {
          monthlyData[month].income += t.amount;
        } else {
          monthlyData[month].expense += t.amount;
        }
      });

      timeSeriesData = Object.values(monthlyData).map((d) => ({
        label: monthNames[d.month],
        income: d.income,
        expense: d.expense,
      }));
    }

    // Thống kê theo category - Build từ transactions thực tế (bao gồm cả categories đã ẩn)
    const categoryIncome = {};
    const categoryExpense = {};

    transactions.forEach((t) => {
      if (t.categoryId) {
        const catId = t.categoryId._id.toString();
        const catName = t.categoryId.name;
        const catType = t.categoryId.type;
        
        if (catType === "in") {
          if (!categoryIncome[catId]) {
            categoryIncome[catId] = { name: catName, value: 0 };
          }
          categoryIncome[catId].value += t.amount;
        } else if (catType === "out") {
          if (!categoryExpense[catId]) {
            categoryExpense[catId] = { name: catName, value: 0 };
          }
          categoryExpense[catId].value += t.amount;
        }
      }
    });

    categoryIncomeData = Object.values(categoryIncome).filter((c) => c.value > 0);
    categoryExpenseData = Object.values(categoryExpense).filter((c) => c.value > 0);

    // Tổng thu chi
    const totalIncome = transactions
      .filter((t) => t.categoryId?.type === "in")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.categoryId?.type === "out")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      year: selectedYear,
      period,
      timeSeriesData,
      categoryIncomeData,
      categoryExpenseData,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
