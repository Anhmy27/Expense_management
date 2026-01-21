import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/categories.js";
import transactionRoutes from "./routes/transactions.js";
import statisticsRoutes from "./routes/statistics.js";
import oauthRoutes from "./routes/oauth.js";
import budgetRoutes from "./routes/budgets.js";

// Validate environment variables
if (!process.env.MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is not defined in environment variables");
  console.error("Please set MONGODB_URI in your .env file or hosting platform");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("⚠️  WARNING: JWT_SECRET is not defined, using default (NOT SECURE)");
}

const app = express();
const PORT = process.env.PORT || 5000;

console.log("🚀 Starting Expense Management Backend...");
console.log("📡 Port:", PORT);
console.log("🔗 MongoDB URI:", process.env.MONGODB_URI.substring(0, 20) + "...");

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/budgets", budgetRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Connect to MongoDB and start server
console.log("🔌 Connecting to MongoDB...");
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  });
