# Web Tuyển Dụng (Next.js + Prisma + NextAuth)

Dự án web tuyển dụng được xây dựng với Next.js (Pages Router), Prisma với SQLite, và NextAuth để xác thực.

## Liên kết (Links)

-   **Live Website:** [https://workHubvercel.app](https://workHubvercel.app)
-   **GitHub Repository:** [https://github.com/maiduykhang/mai-duy-khang](https://github.com/maiduykhang/mai-duy-khang)

## Cài đặt

1.  **Clone repository**
2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
3.  **Tạo file môi trường:**
    Copy file `.env.example` thành `.env` và điền các giá trị cần thiết.
    ```bash
    cp .env.example .env
    ```
    -   `DATABASE_URL`: Đã được cấu hình sẵn cho SQLite.
    -   `NEXTAUTH_SECRET`: Tạo một chuỗi bí mật bằng lệnh `openssl rand -base64 32`.
    -   `NEXTAUTH_URL`: Đặt là `http://localhost:3000` cho môi trường local.

4.  **Khởi tạo cơ sở dữ liệu:**
    Lệnh này sẽ tạo file database SQLite và các bảng dựa trên `schema.prisma`.
    ```bash
    npx prisma db push
    ```

## Chạy Local

Chạy server development:
```bash
npm run dev
```
Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000).

## Build cho Production

```bash
npm run build
```

## Deploy lên Vercel

1.  **Push code lên GitHub.**
2.  **Import project vào Vercel:**
    - Kết nối tài khoản Vercel với repo GitHub của bạn. Vercel sẽ tự động nhận diện đây là dự án Next.js.
3.  **Cấu hình Environment Variables trên Vercel:**
    - Vào phần `Settings > Environment Variables` của project.
    - Thêm `DATABASE_URL`, `NEXTAUTH_SECRET`, và `NEXTAUTH_URL` với các giá trị dành cho production.
    - **Lưu ý:** Vercel sử dụng hệ thống file tạm thời, vì vậy SQLite không phù hợp cho production. Bạn nên chuyển sang một nhà cung cấp PostgreSQL như Supabase hoặc Neon và cập nhật `DATABASE_URL` tương ứng.
4.  **Deploy:**
    Vercel sẽ tự động build và deploy mỗi khi bạn push code lên nhánh chính.