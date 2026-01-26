import mongoose from "mongoose";

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawnAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
    },
    icon: {
      type: String,
      default: "🎯",
    },
    color: {
      type: String,
      default: "#10b981",
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm goals theo user và status
savingsGoalSchema.index({ userId: 1, status: 1 });

// Virtual để tính phần trăm hoàn thành (dựa trên tổng đã đóng góp)
savingsGoalSchema.virtual("percentage").get(function () {
  if (this.status === "completed") return 100;
  if (this.targetAmount === 0) return 0;
  return Math.min(Math.round((this.currentAmount / this.targetAmount) * 100), 100);
});

// Virtual để tính tổng đã đóng góp
savingsGoalSchema.virtual("totalContributed").get(function () {
  return this.currentAmount + this.withdrawnAmount;
});

// Virtual để tính số tiền còn thiếu
savingsGoalSchema.virtual("remaining").get(function () {
  return Math.max(this.targetAmount - this.currentAmount, 0);
});

savingsGoalSchema.set("toJSON", { virtuals: true });
savingsGoalSchema.set("toObject", { virtuals: true });

const SavingsGoal = mongoose.model("SavingsGoal", savingsGoalSchema);

export default SavingsGoal;
