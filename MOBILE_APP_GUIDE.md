# Hướng dẫn nâng cấp thành app điện thoại

Bản này đã được nâng cấp theo 2 hướng:

1. **PWA**: cài trực tiếp từ trình duyệt lên màn hình chính Android/iPhone.
2. **Capacitor-ready**: có sẵn cấu hình để sau này đóng gói thành APK/Android App hoặc iOS App.

---

## 1. Chạy hệ thống như bình thường

Mở Docker Desktop, mở VS Code đúng thư mục project rồi chạy:

```bash
copy .env.example .env
docker compose down -v
docker compose build --no-cache
docker compose up
```

Mở trên máy tính:

```txt
http://localhost:5173
```

Đăng nhập Admin:

```txt
admin@demo.com
Admin@123
```

---

## 2. Cài app trên Android

### Cách dùng trên cùng máy tính

Mở Chrome:

```txt
http://localhost:5173
```

Nếu Chrome đủ điều kiện PWA, trong app sẽ hiện nút:

```txt
Cài app ngay
```

Hoặc trên thanh địa chỉ Chrome sẽ có biểu tượng cài đặt.

### Cách dùng trên điện thoại Android cùng Wi-Fi

Điện thoại không mở được `localhost` của máy tính. Anh cần dùng IP LAN của máy tính.

Trên Windows, mở CMD và chạy:

```bash
ipconfig
```

Tìm dòng IPv4, ví dụ:

```txt
192.168.1.20
```

Trên điện thoại Android, mở Chrome:

```txt
http://192.168.1.20:5173
```

Sau đó bấm:

```txt
⋮ → Thêm vào màn hình chính
```

hoặc bấm nút **Cài app ngay** nếu app hiện gợi ý.

---

## 3. Cài app trên iPhone/iPad

Trên iPhone/iPad, mở Safari:

```txt
http://IP_MAY_TINH:5173
```

Ví dụ:

```txt
http://192.168.1.20:5173
```

Sau đó:

```txt
Bấm nút Chia sẻ → Thêm vào Màn hình chính → Thêm
```

iPhone sẽ tạo icon app ngoài màn hình chính.

---

## 4. Lưu ý quan trọng khi dùng app trên điện thoại

Nếu điện thoại mở được giao diện nhưng đăng nhập lỗi, thường là do điện thoại không gọi được backend.

Kiểm tra trên điện thoại bằng link:

```txt
http://IP_MAY_TINH:4000/api/health
```

Nếu không mở được, kiểm tra:

- Máy tính và điện thoại có cùng Wi-Fi không.
- Docker backend có đang chạy không.
- Windows Firewall có chặn port 4000 hoặc 5173 không.

---

## 5. Đóng gói thành Android App bằng Capacitor

Cách này dành cho giai đoạn sau khi muốn tạo APK.

Vào thư mục frontend:

```bash
cd frontend
npm install
```

Tạo file cấu hình API cho app mobile:

```bash
copy .env.example .env.local
```

Mở file:

```txt
frontend/.env.local
```

Sửa thành IP backend thật, ví dụ:

```txt
VITE_API_URL=http://192.168.1.20:4000/api
```

Build frontend:

```bash
npm run build
```

Thêm Android project:

```bash
npm run mobile:add:android
```

Đồng bộ:

```bash
npm run mobile:build
```

Mở Android Studio:

```bash
npm run mobile:open:android
```

Trong Android Studio có thể build APK.

---

## 6. Đóng gói thành iOS App

Cần máy Mac có Xcode.

```bash
cd frontend
npm install
npm run build
npm run mobile:add:ios
npm run mobile:build
npm run mobile:open:ios
```

Sau đó build bằng Xcode.

---

## 7. File đã được thêm trong bản nâng cấp

```txt
frontend/public/manifest.webmanifest
frontend/public/sw.js
frontend/public/offline.html
frontend/public/favicon.png
frontend/public/apple-touch-icon.png
frontend/public/icons/icon-192.png
frontend/public/icons/icon-512.png
frontend/src/components/InstallAppBanner.tsx
frontend/src/components/NetworkStatus.tsx
frontend/capacitor.config.ts
frontend/.env.example
MOBILE_APP_GUIDE.md
```

---

## 8. Khi nào cần app native thật?

PWA là đủ cho giai đoạn đầu vì:

- Cài được lên màn hình chính.
- Mở như app riêng.
- Responsive tốt trên Android/iPhone/iPad.
- Dễ cập nhật, không cần gửi app store.

App native bằng Capacitor phù hợp khi anh cần:

- Push notification sâu hơn.
- Camera/quét QR nâng cao.
- Upload ảnh tối ưu hơn.
- Phát hành APK cho HLV/phụ huynh.
- Đưa lên Google Play/App Store.
