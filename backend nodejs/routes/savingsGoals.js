import express from "express";
import SavingsGoal from "../models/SavingsGoal.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import authMiddleware from "../middleware/auth.js";
import { checkSavingsNotifications } from "../utils/notificationHelper.js";

const router = express.Router();

// Lấy tất cả savings goals của user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.userId };
    
    if (status) {
      filter.status = status;
    }

    const goals = await SavingsGoal.find(filter).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy một savings goal theo ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    res.json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Tạo savings goal mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, targetAmount, deadline, icon, color } = req.body;

    if (!name || !targetAmount) {
      return res.status(400).json({ message: "Vui lòng nhập tên và số tiền mục tiêu" });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({ message: "Số tiền mục tiêu phải lớn hơn 0" });
    }

    const goal = new SavingsGoal({
      userId: req.user.userId,
      name,
      description,
      targetAmount,
      deadline: deadline ? new Date(deadline) : null,
      icon: icon || "🎯",
      color: color || "#10b981",
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Cập nhật savings goal
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, description, targetAmount, deadline, icon, color, status } = req.body;

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    if (name) goal.name = name;
    if (description !== undefined) goal.description = description;
    if (targetAmount !== undefined) {
      if (targetAmount <= 0) {
        return res.status(400).json({ message: "Số tiền mục tiêu phải lớn hơn 0" });
      }
      goal.targetAmount = targetAmount;
    }
    if (deadline !== undefined) goal.deadline = deadline ? new Date(deadline) : null;
    if (icon) goal.icon = icon;
    if (color) goal.color = color;
    if (status) {
      goal.status = status;
      if (status === "completed") {
        goal.completedAt = new Date();
      }
    }

    await goal.save();
    res.json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Đóng góp tiền vào savings goal từ ví
router.post("/:id/contribute", authMiddleware, async (req, res) => {
  try {
    const { walletId, amount, note } = req.body;

    if (!walletId || !amount) {
      return res.status(400).json({ message: "Vui lòng chọn ví và nhập số tiền" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Số tiền phải lớn hơn 0" });
    }

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    if (goal.status !== "active") {
      return res.status(400).json({ message: "Mục tiêu này không còn hoạt động" });
    }

    const wallet = await Wallet.findOne({
      _id: walletId,
      userId: req.user.userId,
    });

    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ 
        message: `Số dư ví không đủ! Số dư hiện tại: ${wallet.balance.toLocaleString("vi-VN")}₫, cần: ${amount.toLocaleString("vi-VN")}₫` 
      });
    }

    // Tạo transaction - không dùng categoryId, dùng categoryName
    const transaction = new Transaction({
      userId: req.user.userId,
      walletId: walletId,
      amount: amount,
      categoryName: "Tiết kiệm",
      note: note || `Đóng góp vào mục tiêu: ${goal.name}`,
      transactionDate: new Date(),
      type: "normal",
      savingsGoalId: goal._id,
    });

    await transaction.save();

    // Trừ tiền từ ví
    wallet.balance -= amount;
    await wallet.save();

    // Cộng tiền vào savings goal
    goal.currentAmount += amount;
    
    // Tự động complete nếu đạt mục tiêu
    if (goal.currentAmount >= goal.targetAmount && goal.status === "active") {
      goal.status = "completed";
      goal.completedAt = new Date();
    }
    
    await goal.save();

    // Kiểm tra savings notifications (real-time)
    checkSavingsNotifications(req.user.userId, goal._id);

    res.json({
      goal,
      transaction: await transaction.populate("walletId"),
      message: "Đóng góp thành công!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Rút tiền từ savings goal về ví
router.post("/:id/withdraw", authMiddleware, async (req, res) => {
  try {
    const { walletId, amount, note } = req.body;

    if (!walletId || !amount) {
      return res.status(400).json({ message: "Vui lòng chọn ví và nhập số tiền" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Số tiền phải lớn hơn 0" });
    }

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    if (goal.currentAmount < amount) {
      return res.status(400).json({ 
        message: `Số tiền trong mục tiêu không đủ! Số dư hiện tại: ${goal.currentAmount.toLocaleString("vi-VN")}₫` 
      });
    }

    const wallet = await Wallet.findOne({
      _id: walletId,
      userId: req.user.userId,
    });

    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    // Tạo transaction - không dùng categoryId, dùng categoryName
    const transaction = new Transaction({
      userId: req.user.userId,
      walletId: walletId,
      amount: amount,
      categoryName: "Rút tiết kiệm",
      note: note || `Rút từ mục tiêu: ${goal.name}`,
      transactionDate: new Date(),
      type: "normal",
      savingsGoalId: goal._id,
    });

    await transaction.save();

    // Cộng tiền vào ví
    wallet.balance += amount;
    await wallet.save();

    // Cộng vào số tiền đã rút, giảm currentAmount
    goal.withdrawnAmount += amount;
    goal.currentAmount -= amount;

    // Lưu lại giá trị percentage trước khi rút
    const prevPercentage = Math.min(Math.round(((goal.currentAmount + amount) / goal.targetAmount) * 100), 100);
    await goal.save();

    // Nếu goal đang active và percentage giảm xuống dưới milestone thì xóa notification milestone
    if (goal.status === "active") {
      const newPercentage = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
      if ((prevPercentage >= 75 && newPercentage < 75) || (prevPercentage >= 50 && newPercentage < 50)) {
        const { removeNotification } = await import("../utils/notificationHelper.js");
        await removeNotification(req.user.userId, "SAVINGS_MILESTONE", goal._id);
      }
    }

    // Kiểm tra savings notifications sau khi rút tiền
    checkSavingsNotifications(req.user.userId, goal._id);

    res.json({
      goal,
      transaction: await transaction.populate("walletId"),
      message: "Rút tiền thành công!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Xóa savings goal
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    if (goal.currentAmount > 0) {
      return res.status(400).json({ 
        message: "Không thể xóa mục tiêu còn tiền! Vui lòng rút hết tiền trước." 
      });
    }

    await SavingsGoal.deleteOne({ _id: req.params.id });
    res.json({ message: "Đã xóa mục tiêu thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy lịch sử giao dịch của savings goal
router.get("/:id/transactions", authMiddleware, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
    }

    // Tìm transactions theo savingsGoalId hoặc note chứa tên goal
    const transactions = await Transaction.find({
      userId: req.user.userId,
      $or: [
        { savingsGoalId: goal._id },
        { note: { $regex: goal.name, $options: "i" } }
      ]
    })
      .populate("walletId")
      .sort({ transactionDate: -1 });

    // Lọc chỉ giữ những transactions thực sự liên quan đến savings goal
    const filteredTransactions = transactions.filter(t => {
      if (t.savingsGoalId && t.savingsGoalId.toString() === goal._id.toString()) {
        return true;
      }
      if (t.note && (t.note.includes("Đóng góp") || t.note.includes("Rút từ mục tiêu")) && t.note.includes(goal.name)) {
        return true;
      }
      return false;
    });

    res.json(filteredTransactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
