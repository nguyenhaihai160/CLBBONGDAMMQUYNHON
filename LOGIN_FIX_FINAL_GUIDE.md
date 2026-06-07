# Sửa lỗi không đăng nhập được - bản final

Bản này sửa 3 lỗi hay gặp nhất khi chạy dạng app điện thoại/PWA:

1. Frontend không còn phụ thuộc proxy `/api` của Vite.
2. Khi mở bằng điện thoại qua IP LAN, frontend tự gọi backend tại `http://IP_MAY_TINH:4000/api`.
3. Backend mở CORS cho localhost và IP LAN.
4. Nếu seed demo bị lỗi, backend vẫn chạy và login demo tự tạo lại tài khoản `admin@demo.com`.

## Link kiểm tra

Desktop:

```txt
http://localhost:4000/api/health
http://localhost:4000/api/auth/debug
```

Điện thoại cùng Wi-Fi, thay IP bằng IP máy tính:

```txt
http://192.168.1.20:4000/api/health
http://192.168.1.20:5173
```

## Nếu vẫn không đăng nhập được

1. Mở trang login.
2. Xem dòng `API:` dưới trạng thái máy chủ.
3. Copy đúng link đó, thêm `/health` nếu cần kiểm tra.

Ví dụ nếu API là:

```txt
http://192.168.1.20:4000/api
```

Thì kiểm tra:

```txt
http://192.168.1.20:4000/api/health
```

Nếu link health không mở được thì backend/Docker/firewall chưa cho điện thoại truy cập.
