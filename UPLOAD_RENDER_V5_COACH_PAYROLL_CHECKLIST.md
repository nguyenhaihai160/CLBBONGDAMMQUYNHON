# Checklist upload Render V5 – Chấm công & lương HLV

## 1. Upload đúng source lên GitHub

Repository ngoài cùng phải có:

```txt
backend
frontend
Dockerfile
render.yaml
package.json
README.md
COACH_PAYROLL_UPGRADE_V5.md
UPLOAD_RENDER_V5_COACH_PAYROLL_CHECKLIST.md
```

Không được để source bị lồng trong một thư mục con.

## 2. Commit và push

```txt
Summary: Cap nhat cham cong va tinh luong HLV V5
Commit to main
Push origin
```

## 3. Deploy Render

Vào Render Web Service:

```txt
Manual Deploy → Clear build cache & deploy
```

Không xóa PostgreSQL Database, `DATABASE_URL`, `JWT_SECRET`.

## 4. Kiểm tra bản đúng

Mở:

```txt
https://clbmmquynhon.onrender.com/api/health
```

Phải thấy:

```json
{
  "version": "coach-payroll-v5"
}
```

## 5. Kiểm tra giao diện

Admin đăng nhập sẽ thấy menu:

```txt
Chấm công & lương HLV
```

HLV đăng nhập cũng thấy menu này nhưng chỉ xem được lương của chính mình.

## 6. Quy trình dùng

1. Admin tạo tài khoản HLV nếu chưa có.
2. Admin vào `Chấm công & lương HLV`.
3. Tạo dòng chấm công theo ngày.
4. Bấm tính lương theo tháng.
5. Chốt lương hoặc đánh dấu đã trả.
6. HLV đăng nhập để xem lương của mình.
