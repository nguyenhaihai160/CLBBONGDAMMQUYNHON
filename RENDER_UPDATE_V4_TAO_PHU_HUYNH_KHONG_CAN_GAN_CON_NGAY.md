# Render V4 – Tạo tài khoản phụ huynh không cần gán con ngay

## Sửa lỗi chính

Bản V3 yêu cầu Admin phải chọn ít nhất một học viên trước khi bấm tạo tài khoản phụ huynh. Bản V4 đã sửa quy trình:

1. Admin có thể tạo tài khoản **Phụ huynh** ngay bằng họ tên, email, SĐT và mật khẩu.
2. Việc gán con là tùy chọn khi tạo.
3. Sau khi tạo, Admin có thể vào **Tài khoản phụ huynh → Gán con** để chọn học viên sau.
4. Module **Lịch sử điểm danh** của Admin vẫn được giữ nguyên.

## Dấu nhận diện đã deploy đúng bản

Mở `/api/health`, kết quả phải có:

```json
{ "version": "parent-account-create-unassigned-v4" }
```

Header giao diện Admin phải hiện:

```txt
Online · PH + LSĐD v4
```

## Cập nhật Render đang chạy

- Copy toàn bộ source V4 vào đúng repository GitHub mà Web Service Render đang liên kết.
- Commit và Push lên đúng branch Render đang dùng.
- Trong Render chọn **Manual Deploy → Clear build cache & deploy**.
- Không xóa PostgreSQL, `DATABASE_URL` hoặc `JWT_SECRET` nếu cần giữ dữ liệu cũ.

## Cách kiểm tra tạo phụ huynh

1. Đăng nhập Admin.
2. Vào **Tài khoản phụ huynh** hoặc **Phân quyền tài khoản → Phụ huynh**.
3. Nhập email mới chưa từng tồn tại, ví dụ `phuhuynh.test01@gmail.com`.
4. Không cần chọn con, bấm **Tạo tài khoản phụ huynh**.
5. Sau đó bấm **Gán con** khi đã có học viên.
