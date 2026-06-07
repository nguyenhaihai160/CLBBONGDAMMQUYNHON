# ĐƯA PHẦN MỀM LÊN GITHUB VÀ CHẠY ONLINE BẰNG RENDER

## Kết quả sau khi làm xong

Anh có đường link dạng:

```txt
https://football-academy-manager-pro.onrender.com
```

Admin, HLV và Phụ huynh có thể đăng nhập bằng điện thoại hoặc máy tính ở bất kỳ đâu có Internet.

## Bản Render này khác bản local ở đâu?

- Web React và API Express chạy chung một link Render.
- Dùng Render PostgreSQL thay cho database Docker trên máy tính.
- Có file `render.yaml` để Render tự tạo Web Service + Database.
- Admin đầu tiên được tạo từ biến môi trường bảo mật, không dùng mật khẩu demo công khai.
- Mỗi lần app khởi động, Prisma đồng bộ schema; dữ liệu đã nhập không bị seed ghi đè.

---

# PHẦN A — ĐƯA SOURCE LÊN GITHUB

## Cách dễ nhất, không dùng lệnh

1. Tạo tài khoản hoặc đăng nhập GitHub.
2. Chọn **New repository**.
3. Đặt tên repo:

```txt
football-academy-manager-pro
```

4. Chọn **Private** nếu chứa code nội bộ của trung tâm.
5. Bấm **Create repository**.
6. Tại trang repo mới, chọn **uploading an existing file**.
7. Kéo toàn bộ file/thư mục trong project này vào GitHub, bao gồm:

```txt
backend
frontend
render.yaml
package.json
.github
README.md
```

8. Không upload file `.env` có mật khẩu thật.
9. Bấm **Commit changes**.

## Cách bằng Git trong VS Code

Mở Terminal tại thư mục source và chạy:

```powershell
git init
git add .
git commit -m "Deploy Football Academy Manager lên Render"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB/football-academy-manager-pro.git
git push -u origin main
```

---

# PHẦN B — DEPLOY RENDER TỰ ĐỘNG BẰNG BLUEPRINT

## 1. Tạo tài khoản Render

Đăng nhập Render bằng tài khoản GitHub.

## 2. Tạo Blueprint

1. Trong Render Dashboard, chọn **New +**.
2. Chọn **Blueprint**.
3. Kết nối repository `football-academy-manager-pro` từ GitHub.
4. Render sẽ tự đọc file `render.yaml` và đề xuất tạo:

```txt
football-academy-manager-pro     → Web App
football-academy-manager-db      → PostgreSQL Database
```

5. Tại bước nhập Environment Variables, nhập:

```txt
ADMIN_EMAIL       = email anh dùng để đăng nhập Admin
ADMIN_PASSWORD    = mật khẩu mạnh từ 8 ký tự trở lên
ADMIN_NAME        = Nguyễn Trọng Hùng
ADMIN_PHONE       = số điện thoại của anh
BANK_ACCOUNT      = số tài khoản nhận học phí
BANK_ACCOUNT_NAME = tên chủ tài khoản
ZALO_OA_ID        = để trống nếu chưa có
ZALO_ACCESS_TOKEN = để trống nếu chưa có
```

6. Bấm **Apply / Deploy Blueprint**.

## 3. Chờ build xong

Render sẽ tự:

```txt
- Cài thư viện backend và frontend
- Build giao diện React
- Tạo Prisma Client
- Tạo bảng dữ liệu trên PostgreSQL
- Tạo tài khoản Admin ban đầu
- Mở web online
```

## 4. Kiểm tra web

Mở link Render cấp, ví dụ:

```txt
https://football-academy-manager-pro.onrender.com/api/health
```

Nếu thấy:

```json
{ "status": "ok", "service": "football-academy-manager" }
```

thì vào link chính và đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` đã nhập khi deploy.

---

# PHẦN C — CÁC BƯỚC DÙNG SAU KHI ĐĂNG NHẬP

1. Vào **Cấu hình CLB** để upload logo và QR học phí.
2. Vào **Lớp học** để tạo lớp.
3. Vào **Lịch tập** để phân bổ sân và lịch.
4. Vào **Tài khoản** để tạo HLV.
5. Vào **Học viên** để thêm học viên.
6. Vào **Phụ huynh** để tạo tài khoản phụ huynh và gán con.

---

# PHẦN D — LƯU Ý BẢN FREE

- Render Free Web Service có thể ngủ khi lâu không có người truy cập; lần mở đầu có thể chậm.
- Render Free PostgreSQL dùng để thử nghiệm, không nên lưu dữ liệu thật lâu dài.
- Khi bắt đầu nhập dữ liệu học viên thật, hãy nâng Database lên gói trả phí hoặc chuyển sang VPS có backup.

---

# PHẦN E — CẬP NHẬT PHẦN MỀM SAU NÀY

Khi có bản source mới:

1. Chép file mới vào thư mục GitHub local.
2. Chạy:

```powershell
git add .
git commit -m "Nâng cấp phần mềm"
git push
```

3. Render tự deploy lại do `autoDeployTrigger: commit`.

---

# PHẦN F — LỖI HAY GẶP

## Build lỗi `npm install`

Kiểm tra GitHub có upload đúng hai file:

```txt
backend/package-lock.json
frontend/package-lock.json
```

Bản này đã thay các đường dẫn package về registry công khai để Render tải được.

## Vào link nhưng báo không có Admin

Vào Render → Service → Environment, kiểm tra đã nhập:

```txt
ADMIN_EMAIL
ADMIN_PASSWORD
```

Sau đó chọn **Manual Deploy → Deploy latest commit**.

## Link mở chậm sau một thời gian không dùng

Đây là giới hạn của gói Free. Chờ web khởi động lại rồi đăng nhập.
