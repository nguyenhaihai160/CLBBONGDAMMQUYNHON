# Bản fix lỗi Prisma / OpenSSL trong Docker

Bản này sửa lỗi backend bị restart liên tục với thông báo:

```txt
Prisma failed to detect the libssl/openssl version
Error: Could not parse schema engine response
football_academy_backend exited with code 1
```

## Nguyên nhân

Backend dùng image `node:22-alpine`. Alpine không có sẵn OpenSSL/libssl phù hợp để Prisma chạy `db push`, nên backend bị crash. Khi backend crash, frontend gọi API login sẽ báo lỗi hệ thống hoặc `ECONNREFUSED`.

## Cách sửa trong bản này

- Đổi backend Docker image sang `node:20-bookworm-slim`
- Cài sẵn `openssl` và `ca-certificates`
- Bỏ `npm install` khỏi command runtime để chạy nhanh hơn
- Giữ nguyên cấu trúc project, database, API, frontend

## Cách chạy sạch

```bash
docker compose down -v

docker compose build --no-cache

docker compose up
```

Sau đó vào:

```txt
http://localhost:5173
```

Tài khoản Admin:

```txt
admin@demo.com
Admin@123
```
