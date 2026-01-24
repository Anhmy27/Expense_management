import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "BUDGET_WARNING",
        "BUDGET_EXCEEDED",
        "SAVINGS_MILESTONE",
        "SAVINGS_COMPLETED",
        "DEADLINE_REMINDER",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    relatedType: {
      type: String,
      enum: ["budget", "savingsGoal"],
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

// Index compound cho query hiệu quả
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL index - tự động xóa notification sau expiresAt
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
