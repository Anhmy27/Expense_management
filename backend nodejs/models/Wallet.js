import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["cash", "bank", "credit", "ewallet"],
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "VND",
    },
    icon: {
      type: String,
      default: "💰",
    },
    color: {
      type: String,
      default: "#6366f1",
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm ví theo user nhanh hơn
walletSchema.index({ userId: 1, isActive: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
