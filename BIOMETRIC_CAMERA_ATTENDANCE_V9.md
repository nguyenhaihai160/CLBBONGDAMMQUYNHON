# Nâng cấp V9: Điểm danh bằng camera khuôn mặt / mống mắt

Bản V9 bổ sung module **Camera AI** cho Admin và Huấn luyện viên.

## Tính năng

- Bật camera trực tiếp trong trình duyệt.
- Đăng ký mẫu sinh trắc học cho từng học viên.
- Hỗ trợ 3 chế độ:
  - Khuôn mặt
  - Mống mắt/vùng mắt
  - Khuôn mặt + mống mắt
- Nhận diện học viên từ camera.
- Kiểm tra thủ công liveness/anti-spoof trước khi tự động điểm danh.
- Tự động lưu điểm danh `Có mặt` khi đạt ngưỡng.
- Lưu log nhận diện gần đây.
- HLV chỉ thao tác trong lớp được Admin gán.
- Admin xem được toàn bộ.

## Lưu ý quan trọng

Bản này là **prototype nội bộ**. Nhận diện mống mắt chính xác cần camera/SDK chuyên dụng. Webcam hoặc điện thoại thường chỉ tạo mẫu thử từ vùng mắt, không nên xem là xác thực sinh trắc học cấp cao.

Trước khi dùng cho học viên nhỏ tuổi, CLB nên có sự đồng ý của phụ huynh và quy định rõ việc lưu/khóa/xóa dữ liệu sinh trắc học.

## Cách dùng

1. Đăng nhập Admin hoặc HLV.
2. Vào menu **Camera AI**.
3. Chọn lớp.
4. Bấm **Bật camera**.
5. Chọn học viên.
6. Bấm **Đăng ký / cập nhật mẫu cho học viên**.
7. Khi điểm danh, bật các tick:
   - Đã kiểm tra người thật
   - Đã kiểm tra chống điểm danh hộ
   - Tự động lưu điểm danh khi đạt ngưỡng
8. Bấm **Nhận diện & điểm danh**.

## Kiểm tra phiên bản

Mở:

```txt
/api/health
```

Phải thấy:

```txt
biometric-face-iris-camera-v9
```
