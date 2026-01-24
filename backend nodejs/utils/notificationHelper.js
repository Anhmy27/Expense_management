import Notification from "../models/Notification.js";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import SavingsGoal from "../models/SavingsGoal.js";

// Tạo thông báo (tránh duplicate)
export async function createNotification(data) {
  const { userId, type, relatedId, relatedType } = data;

  // Kiểm tra đã có notification tương tự chưa (trong 24h)
  const existingNotification = await Notification.findOne({
    userId,
    type,
    relatedId,
    relatedType,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  // Nếu đã có notification tương tự trong 24h → không tạo mới
  if (existingNotification) {
    return existingNotification;
  }

  // Tạo notification mới với expiresAt = 30 ngày
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const notification = await Notification.create({
    ...data,
    expiresAt,
  });

  return notification;
}

// Xóa notification cũ khi trạng thái thay đổi
export async function removeNotification(userId, type, relatedId) {
  await Notification.deleteMany({
    userId,
    type,
    relatedId,
  });
}

// Kiểm tra budget và tạo notification nếu cần
export async function checkBudgetNotifications(userId, categoryId, transactionAmount) {
  try {
    const now = new Date();
    
    // Tìm budget active cho category này
    const budgets = await Budget.find({
      userId,
      categoryId,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).populate("categoryId", "name type");

    for (const budget of budgets) {
      // Tính spent cho budget này
      const spentAgg = await Transaction.aggregate([
        {
          $match: {
            userId: budget.userId,
            categoryId: budget.categoryId._id,
            transactionDate: {
              $gte: budget.startDate,
              $lte: budget.endDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const spent = spentAgg.length > 0 ? spentAgg[0].total : 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      // Xóa các notification cũ nếu spent giảm xuống dưới warning threshold
      if (percentage < budget.warningThreshold) {
        await removeNotification(userId, "BUDGET_WARNING", budget._id);
        await removeNotification(userId, "BUDGET_EXCEEDED", budget._id);
        continue;
      }

      // Check exceeded (>= 100%)
      if (percentage >= 100) {
        await createNotification({
          userId,
          type: "BUDGET_EXCEEDED",
          title: "🚨 Vượt ngân sách",
          message: `Ngân sách "${budget.categoryId.name}" đã vượt quá ${Math.round(percentage)}%`,
          relatedId: budget._id,
          relatedType: "budget",
          data: {
            budgetId: budget._id,
            categoryName: budget.categoryId.name,
            percentage: Math.round(percentage * 10) / 10,
            spent,
            amount: budget.amount,
          },
        });
      }
      // Check warning (>= warningThreshold nhưng < 100%)
      else if (percentage >= budget.warningThreshold) {
        await createNotification({
          userId,
          type: "BUDGET_WARNING",
          title: "⚠️ Cảnh báo ngân sách",
          message: `Ngân sách "${budget.categoryId.name}" đã đạt ${Math.round(percentage)}%`,
          relatedId: budget._id,
          relatedType: "budget",
          data: {
            budgetId: budget._id,
            categoryName: budget.categoryId.name,
            percentage: Math.round(percentage * 10) / 10,
            spent,
            amount: budget.amount,
            warningThreshold: budget.warningThreshold,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error checking budget notifications:", error);
  }
}

// Kiểm tra savings goal milestone và tạo notification
export async function checkSavingsNotifications(userId, savingsGoalId) {
  try {
    const goal = await SavingsGoal.findById(savingsGoalId);
    if (!goal) return;

    const percentage = goal.percentage;

    // Xóa notification cũ nếu contributed giảm
    if (percentage < 50) {
      await removeNotification(userId, "SAVINGS_MILESTONE", goal._id);
      await removeNotification(userId, "SAVINGS_COMPLETED", goal._id);
      return;
    }

    // Check completed (>= 100%)
    if (percentage >= 100) {
      await createNotification({
        userId,
        type: "SAVINGS_COMPLETED",
        title: "🏆 Hoàn thành mục tiêu",
        message: `Chúc mừng! Bạn đã hoàn thành mục tiêu "${goal.name}"`,
        relatedId: goal._id,
        relatedType: "savingsGoal",
        data: {
          goalId: goal._id,
          goalName: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          percentage: Math.round(percentage * 10) / 10,
        },
      });
    }
    // Check 75% milestone
    else if (percentage >= 75) {
      await createNotification({
        userId,
        type: "SAVINGS_MILESTONE",
        title: "🎊 Sắp hoàn thành mục tiêu",
        message: `Mục tiêu "${goal.name}" đã đạt 75%, sắp hoàn thành rồi!`,
        relatedId: goal._id,
        relatedType: "savingsGoal",
        data: {
          goalId: goal._id,
          goalName: goal.name,
          percentage: Math.round(percentage * 10) / 10,
          remaining: goal.remaining,
        },
      });
    }
    // Check 50% milestone
    else if (percentage >= 50) {
      await createNotification({
        userId,
        type: "SAVINGS_MILESTONE",
        title: "🎉 Đạt nửa chặng đường",
        message: `Mục tiêu "${goal.name}" đã đạt 50%, tiếp tục phát huy nhé!`,
        relatedId: goal._id,
        relatedType: "savingsGoal",
        data: {
          goalId: goal._id,
          goalName: goal.name,
          percentage: Math.round(percentage * 10) / 10,
          remaining: goal.remaining,
        },
      });
    }
  } catch (error) {
    console.error("Error checking savings notifications:", error);
  }
}

// Kiểm tra deadline (chạy bằng cron job hàng ngày)
export async function checkDeadlineReminders() {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Check budgets sắp hết hạn (3 ngày)
    const endingBudgets = await Budget.find({
      endDate: {
        $gte: now,
        $lte: threeDaysLater,
      },
    }).populate("categoryId", "name");

    for (const budget of endingBudgets) {
      const daysLeft = Math.ceil((budget.endDate - now) / (1000 * 60 * 60 * 24));
      
      await createNotification({
        userId: budget.userId,
        type: "DEADLINE_REMINDER",
        title: "📅 Ngân sách sắp kết thúc",
        message: `Ngân sách "${budget.categoryId.name}" sẽ kết thúc trong ${daysLeft} ngày`,
        relatedId: budget._id,
        relatedType: "budget",
        data: {
          budgetId: budget._id,
          categoryName: budget.categoryId.name,
          endDate: budget.endDate,
          daysLeft,
        },
      });
    }

    // Check savings goals sắp đến deadline (7 ngày)
    const endingGoals = await SavingsGoal.find({
      deadline: {
        $gte: now,
        $lte: sevenDaysLater,
      },
    });

    for (const goal of endingGoals) {
      const daysLeft = Math.ceil((goal.deadline - now) / (1000 * 60 * 60 * 24));
      
      await createNotification({
        userId: goal.userId,
        type: "DEADLINE_REMINDER",
        title: "⏰ Mục tiêu sắp đến hạn",
        message: `Mục tiêu "${goal.name}" sẽ đến hạn trong ${daysLeft} ngày`,
        relatedId: goal._id,
        relatedType: "savingsGoal",
        data: {
          goalId: goal._id,
          goalName: goal.name,
          deadline: goal.deadline,
          daysLeft,
          remaining: goal.remaining,
        },
      });
    }
  } catch (error) {
    console.error("Error checking deadline reminders:", error);
  }
}
