# Nâng cấp V5 – Chấm công & tính lương Huấn luyện viên

Bản này bổ sung module nhân sự cho Huấn luyện viên.

## Tính năng Admin

Admin có menu mới:

```txt
Chấm công & lương HLV
```

Admin có thể:

- Chấm công HLV theo ngày.
- Gán dòng chấm công với lớp/đội cụ thể.
- Chọn trạng thái: Có mặt / Vắng / Xin phép.
- Nhập số buổi, số giờ, lương mỗi buổi.
- Tự tính thành tiền theo buổi dạy.
- Xóa dòng chấm công sai.
- Tính lương tháng cho từng HLV.
- Cộng lương cơ bản, lương theo buổi, thưởng và khấu trừ.
- Chốt bảng lương.
- Đánh dấu đã thanh toán lương.

## Tính năng HLV

Tài khoản Huấn luyện viên có thể vào menu:

```txt
Chấm công & lương HLV
```

HLV chỉ xem được dữ liệu của chính mình:

- Số buổi đã được chấm công.
- Lịch sử chấm công theo tháng.
- Tiền theo buổi.
- Bảng lương tháng.
- Trạng thái: Tạm tính / Đã chốt / Đã thanh toán.

HLV không thể xem bảng lương của HLV khác.

## Database mới

Bản này thêm:

```txt
CoachWorkLog
CoachPayroll
CoachWorkStatus
CoachPayrollStatus
```

Khi deploy trên Render hoặc chạy Docker, hệ thống sẽ tự chạy Prisma `db push` để cập nhật bảng mới.

## Kiểm tra bản đúng

Mở:

```txt
/api/health
```

Phải thấy:

```json
{
  "version": "coach-payroll-v5"
}
```

Trên giao diện header sẽ hiện:

```txt
Online · Payroll v5
```

## Cách dùng nhanh

1. Admin đăng nhập.
2. Vào `Phân quyền tài khoản` để tạo tài khoản HLV nếu chưa có.
3. Vào `Chấm công & lương HLV`.
4. Chọn HLV, lớp, ngày, số buổi, lương/buổi.
5. Bấm `Lưu chấm công HLV`.
6. Chọn tháng và HLV.
7. Nhập lương cơ bản/thưởng/khấu trừ nếu có.
8. Bấm `Tính / cập nhật bảng lương`.
9. Bấm `Chốt` hoặc `Đã trả`.

## Deploy Render

Sau khi push lên GitHub, vào Render:

```txt
Manual Deploy → Clear build cache & deploy
```

Không xóa database nếu muốn giữ dữ liệu.
