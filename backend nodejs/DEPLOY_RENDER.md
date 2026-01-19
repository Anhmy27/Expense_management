# Deploy Backend to Render

## Bước 1: Tạo Web Service trên Render

1. Truy cập [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect GitHub repository: `Anhmy27/Expense_management`
4. Cấu hình như sau:

## Bước 2: Cấu hình Web Service

### Basic Settings

```
Name: expense-management-backend
Region: Singapore (hoặc gần nhất)
Branch: main
Root Directory: backend nodejs
```

### Build & Deploy Settings

```
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### Instance Settings

```
Instance Type: Free
```

## Bước 3: Environment Variables (QUAN TRỌNG!)

Vào tab **Environment** và thêm các biến sau:

```env
MONGODB_URI=mongodb+srv://mytahe170103:<PASSWORD>@cluster0.kpixlbp.mongodb.net/Cluster0

JWT_SECRET=your_production_jwt_secret_key_min_32_characters_random

PORT=5000
```

**⚠️ LƯU Ý:**

- Thay `<PASSWORD>` bằng password MongoDB Atlas của bạn
- Tạo JWT_SECRET ngẫu nhiên, mạnh (32+ ký tự)

## Bước 4: Deploy

1. Click **Create Web Service**
2. Đợi deploy hoàn tất (3-5 phút)
3. Kiểm tra logs xem có lỗi không
4. Test endpoint: `https://your-app.onrender.com/api/health`

## Bước 5: Lấy URL Backend

Sau khi deploy thành công:

- URL sẽ có dạng: `https://expense-management-backend-xxxx.onrender.com`
- Copy URL này để config frontend

## Troubleshooting

### Lỗi "MONGODB_URI is not defined"

→ Kiểm tra lại Environment Variables trên Render

### Lỗi "MongoDB connection error"

→ Kiểm tra:

- MongoDB Atlas Network Access (cho phép 0.0.0.0/0)
- Username/Password đúng
- Database name đúng

### Lỗi "Port already in use"

→ Render tự động assign port, không cần thay đổi

## MongoDB Atlas Network Access

1. Vào MongoDB Atlas → Network Access
2. Click **Add IP Address**
3. Chọn **Allow Access From Anywhere** (0.0.0.0/0)
4. Click **Confirm**

## Auto-Deploy

Render sẽ tự động deploy lại khi bạn push code lên GitHub branch `main`.
