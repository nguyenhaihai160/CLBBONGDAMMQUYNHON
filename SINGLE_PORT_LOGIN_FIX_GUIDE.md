# Bản sửa đăng nhập triệt để - Single Port

Bản này bỏ mô hình chạy frontend/backend tách cổng. Giao diện React và API backend chạy chung tại:

```txt
http://localhost:5173
```

API kiểm tra tại:

```txt
http://localhost:5173/api/health
```

Trên iPhone cùng Wi-Fi chỉ cần mở:

```txt
http://IP_MAY_TINH:5173
```

Không cần mở port 4000 nữa.

## Chạy lại sạch

```bash
copy .env.example .env
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

## Đăng nhập

```txt
admin@demo.com
Admin@123
```

Nếu vẫn lỗi, mở trên trình duyệt:

```txt
http://localhost:5173/api/health
http://localhost:5173/api/auth/debug
```

Nếu mở trên iPhone:

```txt
http://IP_MAY_TINH:5173/api/health
http://IP_MAY_TINH:5173/api/auth/debug
```

## Nếu iPhone còn giữ cache app cũ

1. Xóa icon app cũ ngoài màn hình chính.
2. Mở Safari > vào lại `http://IP_MAY_TINH:5173`.
3. Bấm nút `Xóa cache app` ở màn hình đăng nhập nếu có.
4. Chia sẻ > Thêm vào Màn hình chính lại.
