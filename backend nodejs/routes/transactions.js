import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy danh sách giao dịch với bộ lọc
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, categoryId, type, page = 1, limit = 20 } = req.query;
    
    const filter = { userId: req.userId };

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate);
      }
    }

    // Lọc theo category
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Lọc theo type (in/out)
    if (type && ["in", "out"].includes(type)) {
      const categoryIds = await Category.find({ type }).distinct("_id");
      filter.categoryId = { $in: categoryIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("categoryId", "name type")
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Tạo giao dịch mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { categoryId, amount, note, transactionDate } = req.body;

    if (!categoryId || !amount || !transactionDate) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Số tiền phải lớn hơn 0" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy category" });
    }

    const transaction = new Transaction({
      userId: req.userId,
      categoryId,
      amount,
      note,
      transactionDate: new Date(transactionDate),
    });

    await transaction.save();

    // Cập nhật số dư
    const balanceChange = category.type === "in" ? amount : -amount;
    await User.findByIdAndUpdate(req.userId, {
      $inc: { currentBalance: balanceChange },
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("categoryId", "name type");

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Xóa giao dịch
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate("categoryId");

    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }

    // Hoàn lại số dư
    const balanceChange = transaction.categoryId.type === "in" 
      ? -transaction.amount 
      : transaction.amount;
    
    await User.findByIdAndUpdate(req.userId, {
      $inc: { currentBalance: balanceChange },
    });

    await Transaction.findByIdAndDelete(req.params.id);

    res.json({ message: "Xóa giao dịch thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
