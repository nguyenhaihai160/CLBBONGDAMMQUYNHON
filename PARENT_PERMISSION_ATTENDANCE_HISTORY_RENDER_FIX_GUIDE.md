# Nâng cấp quyền Phụ huynh + Lịch sử điểm danh (Render v3)

## Dấu hiệu đang chạy đúng bản mới

Sau khi deploy xong, mở:

```
https://TEN-APP.onrender.com/api/health
```

Phải thấy trường:

```
"version": "parent-permission-attendance-history-v3"
```

Trong giao diện Admin:

- Header hiện `Online · PH + LSĐD v3`.
- Menu `Phân quyền tài khoản` có thẻ quyền `Phụ huynh`.
- Menu mới `Lịch sử điểm danh` xuất hiện dưới `Điểm danh`.

Nếu không thấy các dấu hiệu này, Render vẫn đang deploy source/commit cũ.

## Quyền Phụ huynh

Admin vào **Phân quyền tài khoản**:

1. Bấm thẻ **Phụ huynh**.
2. Nhập họ tên, email, SĐT, mật khẩu tạm.
3. Chọn ít nhất một học viên là con.
4. Bấm **Tạo tài khoản Phụ huynh**.

Admin cũng có thể mở một tài khoản hiện có, bấm **Đổi quyền** → **Phụ huynh** → chọn con → **Lưu quyền**.

## Lịch sử điểm danh

Admin vào **Lịch sử điểm danh** để:

- Lọc theo khoảng ngày.
- Lọc theo lớp.
- Lọc trạng thái Có mặt / Vắng / Xin phép.
- Tìm theo tên, mã học viên hoặc SĐT phụ huynh.
- Xem ai là người chấm điểm danh.

## Cập nhật Render đang dùng

Chỉ cập nhật source trên repository GitHub mà Web Service Render hiện tại đang kết nối, rồi chạy **Manual Deploy → Deploy latest commit**.

Không xóa PostgreSQL Database, `DATABASE_URL` hoặc `JWT_SECRET` nếu cần giữ dữ liệu cũ.
