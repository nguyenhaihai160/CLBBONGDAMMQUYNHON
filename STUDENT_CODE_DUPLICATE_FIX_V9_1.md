# Bản vá V9.1 - Sửa lỗi trùng mã học viên

## Lỗi

Khi thêm học viên, backend báo lỗi Prisma ở model `Student`, target `studentCode`, API trả `POST /api/students 500`.

## Nguyên nhân

Bản cũ sinh mã học viên bằng tổng số học viên hiện có. Nếu trước đó đã có mã `FA20260001`, xóa học viên, seed lại hoặc dữ liệu không liên tục, mã tự sinh có thể bị trùng.

## Đã sửa

- Sinh mã học viên theo mã lớn nhất hiện có trong năm hiện tại.
- Tự kiểm tra mã chưa tồn tại trước khi tạo.
- Tự retry nếu Prisma báo trùng `studentCode`.
- Health version: `biometric-face-iris-camera-v9-student-code-fix`.

## Cách cập nhật local

```powershell
copy .env.example .env
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up
```

Nếu đang test và muốn xóa dữ liệu cũ:

```powershell
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

## Cách cập nhật Render

Copy bản này vào repository GitHub, commit/push, rồi Render → Manual Deploy → Clear build cache & deploy.
