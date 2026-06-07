# BẢN V3: PHÂN QUYỀN PHỤ HUYNH + LỊCH SỬ ĐIỂM DANH

## Vì sao ảnh cũ chưa thấy Phụ huynh?

Trang trong ảnh chỉ có dropdown **HLV / Admin**, nghĩa là Render/PWA vẫn đang phục vụ build cũ. Bản V3 đã có dấu nhận diện để kiểm tra deploy đúng.

## Dấu hiệu bản V3 đang chạy

1. Mở đường dẫn:

```
https://TEN-APP-CUA-ANH.onrender.com/api/health
```

Kết quả phải chứa:

```json
"version": "parent-permission-attendance-history-v3"
```

2. Đăng nhập Admin, phần header có nhãn:

```
Online · PH + LSĐD v3
```

3. Trong sidebar Admin có:

```
Tài khoản phụ huynh
Phân quyền tài khoản
Lịch sử điểm danh
```

4. Trang **Phân quyền tài khoản** có thẻ màu rõ ràng:

```
Admin | Huấn luyện viên | Phụ huynh
```

## Cập nhật lên GitHub/Render cũ và giữ database

1. Giải nén ZIP V3.
2. Mở repository GitHub đang liên kết với Web Service Render hiện tại.
3. Thay toàn bộ source code cũ bằng source V3, nhưng giữ thư mục `.git` nếu dùng GitHub Desktop.
4. Commit và Push lên branch Render đang sử dụng, thường là `main`.
5. Vào Render → Web Service → **Manual Deploy** → **Clear build cache & deploy**.
6. Không xóa PostgreSQL Database, không xóa `DATABASE_URL`, không đổi `JWT_SECRET` nếu muốn giữ dữ liệu/tài khoản cũ.

## Nếu Safari/iPhone vẫn hiện giao diện cũ

- Xóa icon app cũ trên màn hình chính nếu đã cài PWA.
- Trong Safari mở link web Render trực tiếp và tải lại trang.
- Có thể mở thêm `?v=3` ở cuối link một lần:

```
https://TEN-APP-CUA-ANH.onrender.com/?v=3
```

Bản V3 đã đổi Service Worker cache, sau khi tải được build mới thì cache cũ sẽ bị xóa.

## Tạo tài khoản phụ huynh

Admin → **Phân quyền tài khoản** → bấm thẻ **Phụ huynh** → nhập thông tin → chọn học viên là con → **Tạo tài khoản Phụ huynh**.

Hoặc Admin vào **Tài khoản phụ huynh** để quản lý riêng danh sách phụ huynh và gán con.

## Xem lịch sử điểm danh

Admin → **Lịch sử điểm danh**:

- Lọc từ ngày/đến ngày.
- Lọc theo lớp.
- Lọc theo Có mặt / Vắng / Xin phép.
- Tìm bằng tên, mã học viên hoặc SĐT phụ huynh.
- Xem người đã chấm điểm danh và ghi chú.
