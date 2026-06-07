# Bản sửa lỗi đăng nhập PWA/iPhone

Bản này sửa lỗi thường gặp khi mở app bằng iPhone qua IP máy tính.

## Nguyên nhân

Bản cũ để frontend gọi thẳng backend qua:

```txt
http://IP_MAY_TINH:4000/api
```

Trên nhiều máy Windows, điện thoại mở được port `5173` nhưng port `4000` bị Firewall/Docker chặn, nên đăng nhập lỗi.

## Cách sửa trong bản này

Frontend mặc định gọi:

```txt
/api
```

Sau đó Vite proxy trong Docker tự chuyển tiếp sang backend:

```txt
frontend:5173/api  →  backend:4000/api
```

Vì vậy iPhone chỉ cần mở:

```txt
http://IP_MAY_TINH:5173
```

và đăng nhập bình thường.

## Cách chạy sạch

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

Mở trên máy tính:

```txt
http://localhost:5173
```

Mở health cùng origin:

```txt
http://localhost:5173/api/health
```

Mở trên iPhone cùng Wi-Fi:

```txt
http://IP_MAY_TINH:5173
```

Kiểm tra backend qua proxy trên iPhone:

```txt
http://IP_MAY_TINH:5173/api/health
```

Không cần mở port `4000` trên iPhone nữa.

## Tài khoản demo

```txt
admin@demo.com
Admin@123
```

```txt
coach@demo.com
Coach@123
```
