# Nâng cấp giao diện CLB MM Quy Nhơn – Theme Xanh & Cam V8

Bản này đổi màu chủ đạo giao diện theo nhận diện CLB MM Quy Nhơn:

- Xanh dương chủ đạo: `#16A34A`
- Xanh navy nền sidebar: `#064E3B`
- Cam năng lượng: `#FF7A00`
- Cam phụ: `#FFB020`

## Khu vực đã đổi màu

- Sidebar desktop
- Header
- Bottom navigation trên điện thoại
- Màn hình đăng nhập
- Nút chính `btn-primary`
- Card dashboard
- Quick actions
- Chatbot
- Cổng phụ huynh, QR học phí, thẻ học viên
- Các badge trạng thái và vùng nhấn chính

## Kiểm tra sau khi chạy

Mở:

```txt
http://localhost:5173/api/health
```

Phải thấy:

```txt
mm-quy-nhon-green-orange-theme-v8
```

## Chạy local

```powershell
copy .env.example .env
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up
```
