import express from "express";
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import Wallet from "../models/Wallet.js";

const router = express.Router();

// Dashboard API - Gộp tất cả data cần thiết cho homepage
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Parse filters từ query params (giống transactions route)
    const {
      categoryId,
      walletId,
      type,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = { userId };

    if (categoryId) filters.categoryId = categoryId;
    if (walletId) filters.walletId = walletId;
    if (type) filters.type = type;
    if (search) {
      filters.$or = [
        { note: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      filters.transactionDate = {};
      if (startDate) filters.transactionDate.$gte = new Date(startDate);
      if (endDate) filters.transactionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute all queries in parallel
    const [user, transactions, total, categories, activeBudgets, wallets] =
      await Promise.all([
        // 1. User profile
        User.findById(userId).select("-password"),

        // 2. Transactions with pagination
        Transaction.find(filters)
          .populate("categoryId", "name type")
          .populate("walletId", "name currency")
          .sort({ transactionDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),

        // 3. Total count for pagination
        Transaction.countDocuments(filters),

        // 4. Categories
        Category.find({ userId }).sort({ name: 1 }),

        // 5. Active budgets with spent calculation
        (async () => {
          const now = new Date();
          const budgets = await Budget.find({
            userId,
            startDate: { $lte: now },
            endDate: { $gte: now },
          })
            .populate("categoryId", "name type")
            .sort({ startDate: -1 });

          // Calculate spent for each budget
          const budgetsWithSpent = await Promise.all(
            budgets.map(async (budget) => {
              const spent = await Transaction.aggregate([
                {
                  $match: {
                    userId: budget.userId,
                    categoryId: budget.categoryId._id,
                    transactionDate: {
                      $gte: budget.startDate,
                      $lte: budget.endDate,
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                  },
                },
              ]);

              const totalSpent = spent.length > 0 ? spent[0].total : 0;
              const percentage =
                budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;
              const remaining = budget.amount - totalSpent;

              return {
                ...budget.toObject(),
                spent: totalSpent,
                percentage: Math.round(percentage * 10) / 10,
                remaining: remaining,
                isWarning: percentage >= budget.warningThreshold,
                isExceeded: percentage >= 100,
              };
            })
          );

          // Filter only warnings and exceeded
          return budgetsWithSpent.filter(
            (b) => b.isWarning || b.isExceeded
          );
        })(),

        // 6. Wallets
        Wallet.find({ userId }).sort({ createdAt: 1 }),
      ]);

    // Prepare pagination
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    };

    // Return all data in one response
    res.json({
      user,
      transactions,
      pagination,
      categories,
      budgetAlerts: activeBudgets,
      wallets,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    res.status(500).json({
      message: "Lỗi khi tải dữ liệu dashboard",
      error: error.message,
    });
  }
});

export default router;
