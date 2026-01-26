import express from "express";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Lấy tất cả categories của user hiện tại
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { type, includeInactive } = req.query;
    const filter = { userId: req.user.userId };
    
    // Mặc định chỉ lấy category active
    if (includeInactive !== "true") {
      filter.isActive = true;
    }
    
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

    // Kiểm tra xem có category cùng tên đang BỊ ẨN không (case-insensitive)
    const inactiveCategory = await Category.findOne({ 
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      isActive: false
    });

    // Nếu có category đang ẩn → KÍCH HOẠT LẠI
    if (inactiveCategory) {
      inactiveCategory.isActive = true;
      await inactiveCategory.save();
      return res.status(200).json({
        ...inactiveCategory.toObject(),
        message: "Đã kích hoạt lại danh mục"
      });
    }

    // Kiểm tra category ACTIVE đã tồn tại chưa (case-insensitive)
    const existingCategory = await Category.findOne({ 
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      isActive: true
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: "Category đã tồn tại" });
    }

    // Tạo mới category
    const category = new Category({ 
      userId: req.user.userId,
      name, 
      type,
      isActive: true
    });
    await category.save();

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Cập nhật category
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    let { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    name = name.trim();

    if (!name) {
      return res.status(400).json({ message: "Tên category không được để trống" });
    }

    if (!["in", "out"].includes(type)) {
      return res.status(400).json({ message: "Loại category không hợp lệ" });
    }

    // Kiểm tra category tồn tại và thuộc về user
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy category" });
    }

    // Kiểm tra tên mới có bị trùng không (trừ chính nó)
    const existingCategory = await Category.findOne({
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
      type,
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Tên category đã tồn tại" });
    }

    category.name = name;
    category.type = type;
    await category.save();

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Xóa category (Soft Delete)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Kiểm tra category tồn tại và thuộc về user
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy category" });
    }

    // Soft delete: Chỉ set isActive = false
    category.isActive = false;
    await category.save();

    res.json({ 
      message: "Đã ẩn category thành công. Bạn có thể khôi phục lại sau." 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Khôi phục category đã ẩn
router.put("/:id/restore", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: false,
    });

    if (!category) {
      return res.status(404).json({ 
        message: "Không tìm thấy category đã ẩn" 
      });
    }

    // Kiểm tra xem đã có category active cùng tên chưa
    const existingActive = await Category.findOne({
      userId: req.user.userId,
      name: { $regex: new RegExp(`^${category.name}$`, 'i') },
      type: category.type,
      isActive: true,
      _id: { $ne: req.params.id },
    });

    if (existingActive) {
      return res.status(400).json({
        message: `Đã có category "${existingActive.name}" đang hoạt động. Vui lòng đổi tên trước khi khôi phục.`,
      });
    }

    category.isActive = true;
    await category.save();

    res.json({ 
      category,
      message: "Đã khôi phục category thành công!" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
