# Deploy Frontend to Vercel

## Bước 1: Chuẩn bị

Đảm bảo bạn đã có:

- ✅ Backend đã deploy thành công trên Render
- ✅ URL backend (ví dụ: `https://expense-management-backend-xxxx.onrender.com`)

## Bước 2: Deploy lên Vercel

1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import GitHub repository: `Anhmy27/Expense_management`

## Bước 3: Cấu hình Project

### Framework Preset

```
Framework: Next.js
```

### Root Directory

```
Root Directory: frontend
```

### Build Settings

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

## Bước 4: Environment Variables (QUAN TRỌNG!)

Trong phần **Environment Variables**, thêm:

**Variable Name:**

```
NEXT_PUBLIC_API_URL
```

**Value:**

```
https://your-backend-name.onrender.com/api
```

**⚠️ CHÚ Ý:**

- Thay `your-backend-name.onrender.com` bằng URL backend thực tế của bạn
- **PHẢI CÓ `/api` Ở CUỐI!**

**Environment:**

- ✅ Production
- ✅ Preview
- ✅ Development

## Bước 5: Deploy

1. Click **Deploy**
2. Đợi build hoàn tất (2-3 phút)
3. Vercel sẽ cung cấp URL: `https://expense-management-xxxx.vercel.app`

## Bước 6: Cấu hình CORS Backend

Sau khi có URL frontend, cập nhật backend để cho phép CORS từ domain Vercel:

**File:** `backend nodejs/index.js`

```javascript
// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://expense-management-xxxx.vercel.app", // Thay bằng URL Vercel của bạn
      "https://*.vercel.app", // Cho phép tất cả preview deployments
    ],
    credentials: true,
  }),
);
```

Commit và push lên GitHub, Render sẽ tự động deploy lại.

## Bước 7: Test

1. Mở URL Vercel của bạn
2. Thử đăng ký/đăng nhập
3. Kiểm tra các chức năng

## Troubleshooting

### Lỗi "Failed to fetch" / CORS Error

→ Kiểm tra:

- Backend CORS configuration
- URL backend có đúng không
- Có `/api` ở cuối NEXT_PUBLIC_API_URL không

### Lỗi 404 Not Found

→ Kiểm tra:

- Root Directory = `frontend`
- Build command đúng

### Environment variable không hoạt động

→ Nhớ:

- Biến phải bắt đầu với `NEXT_PUBLIC_`
- Redeploy sau khi thêm biến môi trường

## Auto-Deploy

Vercel tự động deploy khi bạn push code lên GitHub:

- `main` branch → Production
- Các branch khác → Preview deployment

## Ví dụ URLs

**Backend (Render):**

```
https://expense-management-backend-abc123.onrender.com
```

**Frontend Environment Variable:**

```
NEXT_PUBLIC_API_URL=https://expense-management-backend-abc123.onrender.com/api
```

**API Call sẽ thành:**

```
https://expense-management-backend-abc123.onrender.com/api/auth/login
https://expense-management-backend-abc123.onrender.com/api/transactions
```
