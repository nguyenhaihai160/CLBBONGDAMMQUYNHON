# Hướng dẫn sửa lỗi không đăng nhập được sau khi nâng cấp PWA

## Nguyên nhân thường gặp

Sau khi nâng cấp thành app điện thoại/PWA, lỗi đăng nhập thường do một trong các nguyên nhân sau:

1. Backend chưa chạy hoặc bị crash.
2. Docker đang dùng lại image/cache cũ.
3. Database cũ chưa được reset sau khi schema thay đổi.
4. PWA/service worker trên trình duyệt hoặc điện thoại còn giữ cache bản cũ.

Bản này đã sửa:

- Prisma generator có `binaryTargets` rõ ràng cho Debian OpenSSL 3.
- Backend Docker image dùng `node:20-bookworm-slim` và cài `openssl`, `libssl3`.
- Docker backend tự chạy `npm install`, `prisma generate`, `prisma db push`, `prisma db seed`.
- Service worker đổi version cache.
- Màn hình đăng nhập có nút `Xóa cache app / đăng nhập lại`.

## Cách chạy sạch lại

Trong thư mục project, chạy:

```bash
docker compose down -v --remove-orphans
```

Sau đó build sạch:

```bash
docker compose build --no-cache
```

Chạy lại:

```bash
docker compose up
```

Mở:

```txt
http://localhost:5173
```

Đăng nhập:

```txt
admin@demo.com
Admin@123
```

## Kiểm tra backend

Mở trình duyệt:

```txt
http://localhost:4000/api/health
```

Nếu đúng sẽ thấy:

```json
{
  "status": "ok",
  "service": "football-academy-manager"
}
```

## Nếu dùng trên điện thoại

Lấy IP máy tính bằng:

```bash
ipconfig
```

Ví dụ IP là `192.168.1.20`, mở trên điện thoại:

```txt
http://192.168.1.20:5173
```

Nếu đã từng cài app ra màn hình chính, hãy xóa app cũ khỏi màn hình chính rồi cài lại bản mới.

## Nếu vẫn báo không đăng nhập được

1. Bấm nút `Xóa cache app / đăng nhập lại` trên màn hình login.
2. Mở tab ẩn danh và thử lại.
3. Chạy lại:

```bash
docker compose logs backend --tail=80
```

Nếu backend không có dòng `exited with code 1` là đã ổn.
