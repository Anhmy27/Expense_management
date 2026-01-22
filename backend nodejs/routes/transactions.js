import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy danh sách giao dịch với bộ lọc
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, categoryId, type, page = 1, limit = 20 } = req.query;
    
    const filter = { userId: req.user.userId };

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
      const categoryIds = await Category.find({ 
        userId: req.user.userId,
        type 
      }).distinct("_id");
      filter.categoryId = { $in: categoryIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("categoryId", "name type")
        .populate("walletId", "name type icon color")
        .populate("relatedWalletId", "name type icon color")
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
    const { categoryId, walletId, amount, note, transactionDate } = req.body;

    if (!categoryId || !amount || !transactionDate) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Số tiền phải lớn hơn 0" });
    }

    // Kiểm tra category tồn tại và thuộc về user
    const category = await Category.findOne({ 
      _id: categoryId,
      userId: req.user.userId 
    });
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy category hoặc bạn không có quyền sử dụng" });
    }

    // Kiểm tra wallet nếu có
    let wallet = null;
    if (walletId) {
      wallet = await Wallet.findOne({
        _id: walletId,
        userId: req.user.userId,
        isActive: true,
      });
      if (!wallet) {
        return res.status(404).json({ message: "Không tìm thấy ví" });
      }
    }

    const transaction = new Transaction({
      userId: req.user.userId,
      categoryId,
      walletId: walletId || undefined,
      amount,
      note,
      transactionDate: new Date(transactionDate),
    });

    await transaction.save();

    // Cập nhật số dư user
    const balanceChange = category.type === "in" ? amount : -amount;
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { currentBalance: balanceChange },
    });

    // Cập nhật số dư ví nếu có
    if (wallet) {
      const walletChange = category.type === "in" ? amount : -amount;
      wallet.balance += walletChange;
      await wallet.save();
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("categoryId", "name type")
      .populate("walletId", "name type icon color");

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
      userId: req.user.userId,
    }).populate("categoryId").populate("walletId");

    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }

    // Hoàn lại số dư user
    const balanceChange = transaction.categoryId.type === "in" 
      ? -transaction.amount 
      : transaction.amount;
    
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { currentBalance: balanceChange },
    });

    // Hoàn lại số dư ví nếu có
    if (transaction.walletId) {
      const walletChange = transaction.categoryId.type === "in"
        ? -transaction.amount
        : transaction.amount;
      await Wallet.findByIdAndUpdate(transaction.walletId._id, {
        $inc: { balance: walletChange },
      });
    }

    await Transaction.findByIdAndDelete(req.params.id);

    res.json({ message: "Xóa giao dịch thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
