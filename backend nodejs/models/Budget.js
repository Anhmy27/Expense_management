import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    period: {
      type: String,
      enum: ["monthly", "weekly"],
      default: "monthly",
    },

    // Cho phép đặt ngân sách cho một khoảng thời gian cụ thể
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Ngưỡng cảnh báo (%), mặc định 80%
    warningThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Index để query nhanh
budgetSchema.index({ userId: 1, categoryId: 1, startDate: 1 });

export default mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
