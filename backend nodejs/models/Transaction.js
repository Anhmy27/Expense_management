import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
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
      required: false, // Không bắt buộc cho giao dịch hệ thống (transfer, savings)
    },

    // Tên danh mục cho giao dịch hệ thống (không dùng bảng Categories)
    categoryName: {
      type: String,
      trim: true,
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true, // Bắt buộc phải có ví
    },

    amount: {
      type: Number,
      required: true,
    },

    note: {
      type: String,
      trim: true,
    },

    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["normal", "transfer_out", "transfer_in"],
      default: "normal",
    },

    // Cho giao dịch chuyển ví
    transferId: {
      type: String, // UUID để link 2 transactions chuyển ví
    },

    relatedWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet", // Ví đích (nếu transfer_out) hoặc ví nguồn (nếu transfer_in)
    },

    // Cho giao dịch tiết kiệm
    savingsGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavingsGoal",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
