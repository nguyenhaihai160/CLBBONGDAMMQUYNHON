# Sửa lỗi đăng nhập do app crash

Lỗi đã sửa:

```txt
Error: Cannot find module /app/backend/dist/server.js
```

Nguyên nhân: TypeScript build ra sai thư mục do `rootDir` đang để `.` nên file server nằm trong `dist/src/server.js`, trong khi Docker chạy `dist/server.js`.

Bản này đã sửa `backend/tsconfig.json` để build đúng ra `dist/server.js`.

## Cách chạy sạch

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

Sau đó mở:

```txt
http://localhost:5173/api/health
http://localhost:5173
```

Tài khoản:

```txt
admin@demo.com
Admin@123
```
