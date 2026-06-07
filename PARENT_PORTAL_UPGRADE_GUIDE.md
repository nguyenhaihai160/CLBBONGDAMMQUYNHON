# Module Phụ huynh – nâng cấp mới

## Tính năng

- Thêm vai trò đăng nhập `PARENT`.
- Admin tạo tài khoản phụ huynh và gán một hoặc nhiều học viên.
- Phụ huynh chỉ xem được con đã được gán, không truy cập danh sách học viên/lớp/học phí chung.
- Phụ huynh xem số buổi còn lại, trạng thái gói học, lịch tập và lịch sử điểm danh gần đây.
- Phụ huynh xem công nợ, QR học phí, tài khoản ngân hàng và nội dung chuyển khoản riêng theo mã học viên.
- Phụ huynh tải/in thẻ học viên của con bằng chức năng in/lưu PDF của trình duyệt.

## Tài khoản demo

- Admin: `admin@demo.com` / `Admin@123`
- HLV: `coach@demo.com` / `Coach@123`
- Phụ huynh: `parent@demo.com` / `Parent@123`

Tài khoản phụ huynh demo được liên kết với hai học viên mẫu sau khi hệ thống seed dữ liệu.

## Quy trình sử dụng thực tế

1. Admin vào **Tài khoản** → chọn vai trò **Phụ huynh** → chọn học viên là con của phụ huynh → tạo tài khoản.
2. Admin vào **Cấu hình CLB** → tải logo và QR học phí, nhập ngân hàng/STK/chủ tài khoản.
3. Phụ huynh đăng nhập → mở **Con của tôi** để xem quá trình học, công nợ và QR nộp tiền.
4. Sau khi phụ huynh chuyển khoản, Admin xác nhận thanh toán ở module **Học phí** để cập nhật số buổi/công nợ.

## Chạy Docker

```powershell
copy .env.example .env
docker compose down -v --remove-orphans
docker builder prune -af
docker compose build --no-cache
docker compose up
```

Truy cập: `http://localhost:5173`
