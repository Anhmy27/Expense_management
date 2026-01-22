import express from "express";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import authMiddleware from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Lấy tất cả ví của user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const wallets = await Wallet.find({ 
      userId: req.user.userId,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json(wallets);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách ví", error: error.message });
  }
});

// Lấy chi tiết một ví
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin ví", error: error.message });
  }
});

// Tạo ví mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, type, balance, currency, icon, color, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const wallet = new Wallet({
      userId: req.user.userId,
      name,
      type,
      balance: balance || 0,
      currency: currency || "VND",
      icon: icon || "💰",
      color: color || "#6366f1",
      description,
    });

    await wallet.save();
    res.status(201).json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo ví", error: error.message });
  }
});

// Cập nhật ví
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, type, balance, currency, icon, color, description, isActive } = req.body;

    const wallet = await Wallet.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    if (name !== undefined) wallet.name = name;
    if (type !== undefined) wallet.type = type;
    if (balance !== undefined) wallet.balance = balance;
    if (currency !== undefined) wallet.currency = currency;
    if (icon !== undefined) wallet.icon = icon;
    if (color !== undefined) wallet.color = color;
    if (description !== undefined) wallet.description = description;
    if (isActive !== undefined) wallet.isActive = isActive;

    await wallet.save();
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật ví", error: error.message });
  }
});

// Xóa ví (soft delete)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    // Soft delete
    wallet.isActive = false;
    await wallet.save();

    res.json({ message: "Đã xóa ví thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa ví", error: error.message });
  }
});

// Chuyển tiền giữa các ví
router.post("/transfer", authMiddleware, async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, note } = req.body;

    if (!fromWalletId || !toWalletId || !amount) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Số tiền phải lớn hơn 0" });
    }

    if (fromWalletId === toWalletId) {
      return res.status(400).json({ message: "Không thể chuyển tiền trong cùng một ví" });
    }

    // Lấy cả 2 ví
    const [fromWallet, toWallet] = await Promise.all([
      Wallet.findOne({ _id: fromWalletId, userId: req.user.userId, isActive: true }),
      Wallet.findOne({ _id: toWalletId, userId: req.user.userId, isActive: true }),
    ]);

    if (!fromWallet) {
      return res.status(404).json({ message: "Không tìm thấy ví nguồn" });
    }

    if (!toWallet) {
      return res.status(404).json({ message: "Không tìm thấy ví đích" });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({ message: "Số dư ví nguồn không đủ" });
    }

    // Tìm hoặc tạo 2 categories cho chuyển ví
    let [transferOutCategory, transferInCategory] = await Promise.all([
      Category.findOne({
        userId: req.user.userId,
        name: "Chuyển khoản (Ra)",
        type: "out",
      }),
      Category.findOne({
        userId: req.user.userId,
        name: "Chuyển khoản (Vào)",
        type: "in",
      }),
    ]);

    if (!transferOutCategory) {
      transferOutCategory = await Category.create({
        userId: req.user.userId,
        name: "Chuyển khoản (Ra)",
        type: "out",
      });
    }

    if (!transferInCategory) {
      transferInCategory = await Category.create({
        userId: req.user.userId,
        name: "Chuyển khoản (Vào)",
        type: "in",
      });
    }

    // Cập nhật số dư
    fromWallet.balance -= amount;
    toWallet.balance += amount;

    // Tạo transferId để link 2 transactions
    const transferId = uuidv4();

    // Tạo 2 transactions để lưu lịch sử chuyển tiền
    const transferNote = note || `Chuyển từ ${fromWallet.name} sang ${toWallet.name}`;
    
    const [outTransaction, inTransaction] = await Promise.all([
      // Transaction rút tiền từ ví nguồn (CHI)
      Transaction.create({
        userId: req.user.userId,
        categoryId: transferOutCategory._id,
        walletId: fromWalletId,
        amount: amount,
        note: `${transferNote} (Chuyển ra)`,
        transactionDate: new Date(),
        type: "transfer_out",
        transferId: transferId,
        relatedWalletId: toWalletId, // Ví đích
      }),
      // Transaction nhận tiền vào ví đích (THU)
      Transaction.create({
        userId: req.user.userId,
        categoryId: transferInCategory._id,
        walletId: toWalletId,
        amount: amount,
        note: `${transferNote} (Nhận vào)`,
        transactionDate: new Date(),
        type: "transfer_in",
        transferId: transferId,
        relatedWalletId: fromWalletId, // Ví nguồn
      }),
      fromWallet.save(),
      toWallet.save(),
    ]);

    res.json({
      message: "Chuyển tiền thành công",
      fromWallet,
      toWallet,
      transactions: {
        out: outTransaction,
        in: inTransaction,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi chuyển tiền", error: error.message });
  }
});

// Lấy tổng số dư tất cả ví
router.get("/summary/total", authMiddleware, async (req, res) => {
  try {
    const wallets = await Wallet.find({
      userId: req.user.userId,
      isActive: true,
    });

    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const walletsByType = wallets.reduce((acc, wallet) => {
      if (!acc[wallet.type]) {
        acc[wallet.type] = { count: 0, balance: 0 };
      }
      acc[wallet.type].count++;
      acc[wallet.type].balance += wallet.balance;
      return acc;
    }, {});

    res.json({
      totalBalance,
      totalWallets: wallets.length,
      walletsByType,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tính tổng", error: error.message });
  }
});

export default router;
