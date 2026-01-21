import express from "express";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy tất cả budgets của user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.userId })
      .populate("categoryId", "name type")
      .sort({ startDate: -1 });

    // Tính toán spent cho mỗi budget
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
        const percentage = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;
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

    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách ngân sách", error: error.message });
  }
});

// Lấy budget đang active (trong khoảng thời gian hiện tại)
router.get("/active", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const budgets = await Budget.find({
      userId: req.user.userId,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("categoryId", "name type")
      .sort({ startDate: -1 });

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await Transaction.aggregate([
          {
            $match: {
              userId: budget.userId,
              categoryId: budget.categoryId,
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
        const percentage = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;

        return {
          ...budget.toObject(),
          spent: totalSpent,
          percentage: Math.round(percentage * 10) / 10,
          remaining: budget.amount - totalSpent,
          isWarning: percentage >= budget.warningThreshold,
          isExceeded: percentage >= 100,
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy ngân sách đang hoạt động", error: error.message });
  }
});

// Tạo budget mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { categoryId, amount, period, startDate, endDate, warningThreshold } = req.body;

    // Validate
    if (!categoryId || !amount || !startDate || !endDate) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Kiểm tra category có thuộc user không
    const category = await Category.findOne({
      _id: categoryId,
      userId: req.user.userId,
    });

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    // Kiểm tra trùng budget trong cùng khoảng thời gian
    const existingBudget = await Budget.findOne({
      userId: req.user.userId,
      categoryId,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
    });

    if (existingBudget) {
      return res.status(400).json({ 
        message: "Đã có ngân sách cho danh mục này trong khoảng thời gian này" 
      });
    }

    const budget = new Budget({
      userId: req.user.userId,
      categoryId,
      amount,
      period: period || "monthly",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      warningThreshold: warningThreshold || 80,
    });

    await budget.save();
    await budget.populate("categoryId", "name type");

    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo ngân sách", error: error.message });
  }
});

// Cập nhật budget
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { amount, startDate, endDate, warningThreshold } = req.body;

    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!budget) {
      return res.status(404).json({ message: "Không tìm thấy ngân sách" });
    }

    if (amount !== undefined) budget.amount = amount;
    if (startDate) budget.startDate = new Date(startDate);
    if (endDate) budget.endDate = new Date(endDate);
    if (warningThreshold !== undefined) budget.warningThreshold = warningThreshold;

    await budget.save();
    await budget.populate("categoryId", "name type");

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật ngân sách", error: error.message });
  }
});

// Xóa budget
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!budget) {
      return res.status(404).json({ message: "Không tìm thấy ngân sách" });
    }

    res.json({ message: "Đã xóa ngân sách thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa ngân sách", error: error.message });
  }
});

export default router;
