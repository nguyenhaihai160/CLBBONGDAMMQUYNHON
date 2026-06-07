# SYSTEM DESIGN - Football Academy Manager Pro

## 1. Kiến trúc tổng thể hệ thống

Hệ thống chia theo mô hình 3 lớp rõ ràng:

- **Frontend**: React + Vite + TailwindCSS, giao diện tiếng Việt, responsive cho điện thoại, tablet, desktop.
- **Backend**: Node.js + Express, API REST, Socket.io realtime, JWT Authentication, RBAC phân quyền.
- **Database**: PostgreSQL quản lý dữ liệu thật, Prisma ORM làm lớp truy vấn và migration.
- **Deploy**: Docker Compose chạy 3 service: frontend, backend, database.

Luồng tổng thể:

1. Admin/HLV đăng nhập.
2. Frontend nhận JWT và lưu token.
3. Frontend gọi API qua `/api`.
4. Backend xác thực JWT và kiểm tra quyền.
5. Backend xử lý nghiệp vụ qua Prisma.
6. PostgreSQL lưu dữ liệu.
7. Socket.io phát realtime khi điểm danh/thanh toán thay đổi.

## 2. Cấu trúc thư mục project

```txt
football-academy-manager-pro/
  backend/
    prisma/
      schema.prisma
      seed.ts
    src/
      config/
      middleware/
      modules/
        auth/
        users/
        classes/
        students/
        attendance/
        payments/
        uniforms/
        coach-portal/
        dashboard/
        zalo/
      utils/
      app.ts
      routes.ts
      server.ts
      socket.ts
  frontend/
    src/
      api/
      auth/
      components/
      pages/
      App.tsx
      main.tsx
      styles.css
  docker-compose.yml
  .env.example
  README.md
```

Nguyên tắc nâng cấp: mỗi tính năng nằm trong module riêng, không trộn logic vào một file lớn.

## 3. Database schema Prisma

File chính: `backend/prisma/schema.prisma`.

Các bảng quan trọng:

- `User`: tài khoản Admin/HLV.
- `Class`: lớp học, học phí, số buổi, HLV phụ trách.
- `Student`: học viên, phụ huynh, trạng thái học phí, số buổi.
- `TrainingSchedule`: lịch tập.
- `TrainingField`: sân tập.
- `Attendance`: điểm danh.
- `Payment`: học phí, công nợ, QR payload.
- `UniformProduct`: sản phẩm đồng phục và dụng cụ tập luyện, có tồn kho, mức cảnh báo và trạng thái xóa/ẩn.
- `InventoryTransaction`: lịch sử nhập kho, xuất kho, chỉnh tồn, bán hàng, xóa/khôi phục hàng tồn.
- `UniformOrder`: đơn bán đồng phục/dụng cụ cho học viên.
- `ZaloMessage`: log gửi thông báo Zalo.
- `AuditLog`: nền tảng ghi log thao tác về sau.

## 4. API Backend đầy đủ

Nhóm API hiện có:

```txt
GET    /api/health
POST   /api/auth/login
GET    /api/auth/me
GET    /api/users
POST   /api/users
PATCH  /api/users/:id/status
GET    /api/classes
POST   /api/classes
PUT    /api/classes/:id
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
GET    /api/attendance
POST   /api/attendance/bulk
GET    /api/payments
POST   /api/payments
GET    /api/payments/overdue
PATCH  /api/payments/:id/confirm
GET    /api/uniforms/products
POST   /api/uniforms/products
GET    /api/uniforms/orders
POST   /api/uniforms/orders
GET    /api/dashboard/admin
GET    /api/dashboard/coach
POST   /api/zalo/send
```

## 5. Thiết kế UI/UX

Phong cách UI:

- Màu chủ đạo: xanh sân bóng, xanh lá, nền sáng.
- Sidebar desktop, drawer mobile.
- Card thống kê lớn, dễ nhìn.
- Nút thao tác lớn cho HLV dùng ngoài sân.
- Bảng học viên hiển thị dạng card trên mobile.
- Dashboard Admin và HLV tách riêng theo vai trò.

## 6. Dashboard Admin

Có sẵn:

- Tổng học viên.
- Học viên đang hoạt động.
- Học viên còn nợ học phí.
- Doanh thu tháng.
- Số lớp đang hoạt động.
- Thống kê điểm danh.

## 7. Dashboard Huấn luyện viên

Có sẵn:

- Lớp phụ trách.
- Tổng học viên thuộc lớp mình.
- Lịch tập hôm nay.
- Học viên nghỉ học hôm nay.
- Lối vào nhanh đến điểm danh.

## 8. Responsive mobile/tablet/desktop

Breakpoint đề xuất:

- Mobile `<640px`: menu trượt, card dọc, nút lớn.
- Tablet `640px-1024px`: grid 2 cột.
- Desktop `>1024px`: sidebar cố định, grid 3-4 cột.

Tailwind đã được cấu hình để dùng class responsive như `sm:`, `md:`, `lg:`, `xl:`.

## 9. Flow hoạt động hệ thống

### Flow thêm học viên

1. Admin/HLV vào màn hình học viên.
2. Nhập họ tên, SĐT phụ huynh, lớp, số buổi.
3. Backend tự tạo mã học viên.
4. Lưu học viên vào PostgreSQL.

### Flow điểm danh

1. HLV chọn lớp và ngày.
2. Danh sách học viên hiện ra.
3. Chọn Có mặt/Vắng/Xin phép.
4. Nếu Có mặt, hệ thống tự trừ số buổi còn lại.
5. Nếu sửa từ Có mặt sang Vắng/Xin phép, hệ thống hoàn lại buổi.

### Flow học phí

1. Tạo khoản học phí cho học viên.
2. Backend tạo nội dung chuyển khoản và QR payload.
3. Admin xác nhận thanh toán.
4. Hệ thống cập nhật trạng thái học phí của học viên.

### Flow đồng phục

1. Admin tạo sản phẩm/size/tồn kho.
2. Admin/HLV tạo đơn bán cho học viên.
3. Hệ thống trừ tồn kho.
4. Lưu doanh thu đồng phục.

## 10. Source code mẫu

Source code đã nằm sẵn trong thư mục `backend` và `frontend`.

Các file nên xem trước:

- Backend entry: `backend/src/server.ts`
- API routes: `backend/src/routes.ts`
- Auth middleware: `backend/src/middleware/auth.ts`
- Prisma schema: `backend/prisma/schema.prisma`
- Frontend routes: `frontend/src/App.tsx`
- Layout responsive: `frontend/src/components/Layout.tsx`
- Dashboard Admin: `frontend/src/pages/AdminDashboard.tsx`
- Dashboard HLV: `frontend/src/pages/CoachDashboard.tsx`
- Điểm danh: `frontend/src/pages/Attendance.tsx`

## 11. Docker setup

Có sẵn file `docker-compose.yml` gồm:

- `db`: PostgreSQL.
- `backend`: Node.js Express.
- `frontend`: React Vite.

Lệnh chạy:

```bash
cp .env.example .env
docker compose up --build
```

Khởi tạo database:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npx prisma db seed
```

## 12. Hướng dẫn deploy

Deploy VPS cơ bản:

1. Cài Docker và Docker Compose.
2. Upload project lên server.
3. Tạo `.env` production.
4. Đổi `JWT_SECRET`.
5. Chạy `docker compose up -d --build`.
6. Chạy migrate và seed lần đầu.
7. Dùng Nginx reverse proxy domain về frontend/backend.
8. Cài SSL bằng Certbot.

## 13. Tối ưu hiệu năng

- Prisma query dùng `select/include` có kiểm soát.
- Index cho `Attendance(classId, date)` và `Payment(studentId, status)`.
- Pagination nên thêm khi dữ liệu học viên > 1.000.
- Dashboard dùng aggregate thay vì tải toàn bộ dữ liệu.
- Frontend chia module page, dễ lazy-load về sau.

## 14. Bảo mật hệ thống

Đã có nền tảng:

- JWT authentication.
- Role-based access control.
- Password hash bằng bcrypt.
- Helmet bảo vệ header.
- CORS giới hạn frontend URL.
- Zod validate input.

Nên bổ sung khi production:

- Rate limit login.
- Refresh token.
- Audit log chi tiết.
- Backup PostgreSQL hằng ngày.
- HTTPS bắt buộc.
- Upload ảnh qua storage riêng, không lưu base64 trong database.

## 15. Kế hoạch nâng cấp tương lai

Giai đoạn 1:

- Hoàn thiện CRUD đầy đủ từng module.
- Tìm kiếm học viên.
- Lọc học phí nợ theo lớp/tháng.
- Export Excel.

Giai đoạn 2:

- PWA cài trên điện thoại.
- Offline điểm danh.
- Upload ảnh học viên.
- QR thanh toán VietQR chuẩn.

Giai đoạn 3:

- App mobile React Native.
- Tài khoản phụ huynh.
- Zalo OA thật.
- Multi-branch nhiều cơ sở.
- Báo cáo tài chính nâng cao.

## Nâng cấp bổ sung: quản lý lớp, HLV, thẻ học viên và Zalo

### Quyền Admin bổ sung
- `POST /api/classes`: tạo lớp.
- `PUT /api/classes/:id`: sửa lớp.
- `DELETE /api/classes/:id`: xóa lớp; học viên được chuyển sang chưa phân lớp.
- `DELETE /api/users/:id`: xóa tài khoản HLV; lớp của HLV được gỡ gán.
- `PUT /api/settings/academy`: lưu logo CLB, QR học phí, thông tin ngân hàng.
- `PUT /api/zalo/connection`: lưu thông tin kết nối Zalo OA.
- `POST /api/zalo/send`: gửi demo/log tin nhắn Zalo.

### Thẻ học viên
Frontend route `/student-cards` đọc:
- `/api/students`
- `/api/classes`
- `/api/settings/academy`

Thẻ học viên hiển thị QR học phí đã upload trong `AcademySetting.tuitionQrUrl`. Nội dung chuyển khoản được tạo theo công thức:

```txt
paymentNotePrefix + studentCode + fullName
```

### Zalo OA adapter
Bản demo chưa gọi API Zalo thật. Backend đã có vùng adapter trong:

```txt
backend/src/modules/zalo/zalo.routes.ts
```

Khi triển khai thật, thay phần ghi log demo bằng hàm gọi Zalo OA API, dùng `accessToken` trong bảng `ZaloConnection`.

## Nâng cấp báo cáo và trạng thái gói buổi

### API mới

- `GET /api/reports/revenue-monthly?months=12`
  - Quyền: Admin
  - Trả về doanh thu theo tháng, gồm học phí, đồng phục, tổng doanh thu, số khoản đã thu và công nợ hiện tại.

### Database thay đổi

Bảng `Payment` thêm trường:

```prisma
sessionsApplied Boolean @default(false)
```

Trường này giúp hệ thống biết gói buổi đã được cộng vào học viên hay chưa, tránh cộng trùng khi Admin xác nhận lại thanh toán.

### Logic trạng thái thẻ học viên

Trạng thái được tính theo thứ tự ưu tiên:

1. Học phí chưa PAID → `CHƯA NỘP TIỀN`
2. `sessionRemaining < 0` → `QUÁ BUỔI`
3. `sessionRemaining = 0` → `HẾT BUỔI`
4. `sessionRemaining <= 3` hoặc còn dưới 20% gói → `GẦN HẾT BUỔI`
5. Còn lại → `ĐANG HỌC`

### Excel export

Frontend xuất file `.xls` bằng HTML table tương thích Excel. Cách này nhẹ, không cần thêm thư viện ngoài, phù hợp triển khai Docker nhanh.


## 16. Nâng cấp kho đồng phục/dụng cụ

Module `uniforms` hiện được dùng như module kho tổng hợp:

- `GET /api/uniforms/products`: danh sách hàng còn hoạt động.
- `GET /api/uniforms/products?includeInactive=true`: Admin xem cả hàng đã xóa/ẩn.
- `POST /api/uniforms/products`: Admin thêm hàng tồn.
- `PUT /api/uniforms/products/:id`: Admin sửa hàng tồn.
- `PATCH /api/uniforms/products/:id/stock`: Admin nhập/xuất/chỉnh tồn/khôi phục.
- `DELETE /api/uniforms/products/:id`: Admin xóa/ẩn hàng tồn, hệ thống đưa tồn về 0 và ghi log.
- `GET /api/uniforms/summary`: tổng quan tồn kho, giá trị kho, cảnh báo sắp hết.
- `GET /api/uniforms/transactions`: lịch sử xuất nhập kho.

Thiết kế ưu tiên giữ lịch sử thay vì xóa cứng để bảo toàn dữ liệu bán hàng và kiểm kê.

## 17. Nâng cấp liên kết HLV/Admin

Module `coach-portal` giúp dữ liệu HLV và Admin dùng chung một nguồn:

- HLV chỉ thấy lớp có `coachId` là tài khoản của mình.
- Admin thấy toàn bộ lớp và tình trạng điểm danh từng lớp.
- Điểm danh được lưu qua `Attendance`, có `markedById` để biết ai chấm.
- Menu `Lớp của HLV` lấy dữ liệu từ `GET /api/coach-portal/classes?date=YYYY-MM-DD`.

Flow:

1. Admin tạo lớp và gán HLV.
2. HLV đăng nhập, chỉ thấy lớp được gán.
3. HLV vào `Điểm danh` để chấm học viên.
4. Dữ liệu điểm danh trừ buổi học tự động.
5. Admin vào `Lớp của HLV` để xem lớp nào đã/chưa điểm danh trong ngày.
