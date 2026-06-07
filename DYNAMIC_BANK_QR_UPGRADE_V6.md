# Nâng cấp V6 – QR học phí động theo số tiền Admin chọn

Bản V6 bổ sung cơ chế tạo QR thanh toán động cho từng khoản học phí.

## Chức năng chính

- Admin cấu hình tài khoản ngân hàng tại **Cấu hình CLB**.
- Có thêm trường **Mã BIN ngân hàng** để tạo QR ngân hàng.
- Khi Admin tạo học phí, ví dụ nhập `500000`, hệ thống tự sinh QR đúng số tiền `500.000đ`.
- QR lưu vào khoản thanh toán (`Payment.qrPayload`).
- Phụ huynh vào cổng phụ huynh sẽ thấy QR đúng số tiền còn nợ của khoản học phí mới nhất.
- Admin vẫn cần xác nhận thanh toán sau khi nhận tiền để cập nhật công nợ và cộng buổi học.

## Cấu hình ngân hàng

Vào:

```txt
Admin → Cấu hình CLB
```

Nhập:

```txt
Ngân hàng
Mã BIN ngân hàng
Số tài khoản
Tên chủ tài khoản
Tiền tố nội dung chuyển khoản
```

Ví dụ:

```txt
Ngân hàng: MB Bank
Mã BIN: 970422
Số tài khoản: 123456789
Tên chủ tài khoản: NGUYEN TRONG HUNG
Tiền tố nội dung CK: HP
```

## Cách tạo QR 500.000đ

Vào:

```txt
Admin → Quản lý học phí
```

Chọn học viên, nhập:

```txt
Số tiền cần thu: 500000
Đã đóng trước đó: 0
```

Hệ thống sẽ hiển thị phần **Xem trước QR động**. Sau khi bấm **Tạo học phí + QR 500.000đ**, khoản thu sẽ có QR riêng.

## Phụ huynh thanh toán

Phụ huynh đăng nhập:

```txt
Cổng phụ huynh → Đóng học phí bằng QR
```

Phụ huynh sẽ thấy:

```txt
Số tiền QR
Ngân hàng
Số tài khoản
Tên chủ tài khoản
Nội dung chuyển khoản
Mã QR đúng số tiền cần nộp
```

## Kiểm tra bản đúng

Sau khi deploy Render, mở:

```txt
/api/health
```

Bản đúng trả về:

```json
{
  "version": "dynamic-bank-qr-v6"
}
```
