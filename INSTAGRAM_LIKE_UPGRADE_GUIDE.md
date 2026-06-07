# Instagram-like Mobile UI Upgrade

Bản này nâng cấp phần mềm quản lý CLB bóng đá theo hướng **chạy giống app hiện đại như Instagram**:

## 1. Nâng cấp giao diện

- Mobile-first: ưu tiên trải nghiệm trên iPhone/Android.
- Bottom navigation trên điện thoại: Home, Học viên, Điểm danh, Lịch, Thêm.
- Dashboard kiểu feed hoạt động: hiển thị các việc quan trọng cần xử lý.
- Story bubble: xem nhanh học viên, nợ phí, lớp, lịch, kho.
- Quick actions: thao tác nhanh cho Admin/HLV.
- Header glassmorphism, card bo góc lớn, shadow mềm.
- Giữ nguyên sidebar desktop cho màn hình lớn.

## 2. Cấu trúc chạy ổn hơn

- App chạy single-port: web và API chung `:5173`.
- Frontend gọi API qua `/api`, giảm lỗi khi mở bằng điện thoại.
- Database PostgreSQL không expose port `5432` ra ngoài máy host để tránh xung đột nhiều bản Docker.
- Có sẵn `docker-compose.web.yml` để deploy online với Caddy HTTPS.

## 3. Cách chạy local

```powershell
copy .env.example .env
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

Mở:

```txt
http://localhost:5173
http://localhost:5173/api/health
```

Tài khoản:

```txt
Admin: admin@demo.com / Admin@123
HLV: coach@demo.com / Coach@123
```

## 4. Cách chạy trên điện thoại cùng Wi-Fi

Lấy IP máy tính:

```powershell
ipconfig
```

Ví dụ IP là `192.168.1.12`, mở trên điện thoại:

```txt
http://192.168.1.12:5173
```

## 5. Cách chạy online giống app thật

Dùng bản production:

```bash
cp .env.production.example .env
cp Caddyfile.example Caddyfile
nano .env
nano Caddyfile
docker compose -f docker-compose.web.yml up -d --build
```

Sau khi trỏ domain về VPS:

```txt
https://app.tenclb.com
```

## 6. Gợi ý nâng cấp tiếp

- Push notification cho HLV/phụ huynh.
- Feed thông báo real-time.
- Upload ảnh học viên lên Cloudflare R2/S3.
- Dark mode hoàn chỉnh.
- Chuyển thành app native bằng Capacitor.
