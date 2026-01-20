import express from "express";
import Category from "../models/Category.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy tất cả categories của user hiện tại
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { userId: req.user.userId };
    
    if (type && ["in", "out"].includes(type)) {
      filter.type = type;
    }

    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Tạo category mới
router.post("/", authMiddleware, async (req, res) => {
  try {
    let { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Trim khoảng trắng thừa
    name = name.trim();

    if (!name) {
      return res.status(400).json({ message: "Tên category không được để trống" });
    }

    if (!["in", "out"].includes(type)) {
      return res.status(400).json({ message: "Loại category không hợp lệ" });
    }

    // Kiểm tra category đã tồn tại cho user này chưa (case-insensitive)
    const existingCategory = await Category.findOne({ 
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type 
    });
    if (existingCategory) {
      return res.status(400).json({ message: "Category đã tồn tại" });
    }

    const category = new Category({ 
      userId: req.user.userId,
      name, 
      type 
    });
    await category.save();

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
