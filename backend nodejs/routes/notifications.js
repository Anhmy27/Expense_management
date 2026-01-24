import express from "express";
import authMiddleware from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Lấy danh sách notifications (15 mới nhất)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(15);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông báo", error: error.message });
  }
});

// Đếm số thông báo chưa đọc
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi đếm thông báo", error: error.message });
  }
});

// Đánh dấu 1 notification là đã đọc
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật thông báo", error: error.message });
  }
});

// Đánh dấu tất cả là đã đọc
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật thông báo", error: error.message });
  }
});

// Xóa 1 notification
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.json({ message: "Đã xóa thông báo" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa thông báo", error: error.message });
  }
});

// Xóa tất cả notifications đã đọc
router.delete("/", authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({
      userId: req.user.userId,
      isRead: true,
    });

    res.json({ message: "Đã xóa tất cả thông báo đã đọc" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa thông báo", error: error.message });
  }
});

export default router;
