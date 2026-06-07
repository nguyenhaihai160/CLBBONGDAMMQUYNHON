# Sửa lỗi npm Exit handler never called trong Docker

Bản này đã sửa Dockerfile để:

- Không copy `package-lock.json` ở bước cài thư viện trong Docker.
- Ép npm dùng registry công khai `https://registry.npmjs.org/`.
- Tắt audit/fund/update-notifier để build nhanh và ít treo hơn.
- Cố định npm `10.9.2` thay vì dùng npm mặc định dễ gặp lỗi `Exit handler never called`.
- Thêm `.dockerignore` để tránh copy `node_modules`, `dist`, cache vào Docker context.

## Cách chạy sạch lại

```powershell
copy .env.example .env
docker compose down -v --remove-orphans
docker builder prune -af
docker compose build --no-cache
docker compose up
```

Mở:

```txt
http://localhost:5173/api/health
http://localhost:5173
```

Tài khoản demo:

```txt
admin@demo.com
Admin@123
```
