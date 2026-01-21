import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password không bắt buộc nếu đăng nhập qua Google
      },
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true, // Cho phép nhiều null values
    },

    email: {
      type: String,
      sparse: true,
    },

    name: {
      type: String,
    },

    currentBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);
