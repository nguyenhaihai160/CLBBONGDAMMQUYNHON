# Nâng cấp Chatbot quản lý CLB

Bản này đã gắn chatbot nội bộ vào hệ thống quản lý học viên bóng đá.

## 1. Vị trí sử dụng

Sau khi đăng nhập Admin hoặc HLV, góc phải dưới màn hình có nút chat màu xanh.

Bấm vào nút này để mở chatbot.

## 2. Chatbot hỗ trợ hỏi gì?

Admin có thể hỏi:

- Học viên còn nợ học phí
- Học viên gần hết buổi
- Học viên hết buổi
- Học viên quá buổi
- Lịch tập hôm nay
- Lịch tập ngày mai
- Tình hình điểm danh hôm nay
- Kho đồ sắp hết
- Doanh thu tháng này
- Danh sách lớp học
- Tìm học viên theo tên, mã học viên hoặc số điện thoại phụ huynh

HLV có thể hỏi:

- Lớp của tôi
- Lịch tập hôm nay
- Tình hình điểm danh hôm nay
- Học viên còn nợ học phí trong lớp của mình
- Học viên gần hết buổi trong lớp của mình
- Tìm học viên trong lớp của mình

## 3. Phân quyền dữ liệu

- Admin xem được toàn bộ dữ liệu.
- HLV chỉ xem được dữ liệu lớp được Admin gán.
- HLV không xem được doanh thu toàn hệ thống và kho đồ.

## 4. Cơ chế hiện tại

Bản này dùng chatbot nội bộ dạng rule-based + truy vấn database trực tiếp.

Ưu điểm:

- Không cần API trả phí
- Không cần mạng ngoài
- Chạy ổn định trong Docker
- Không gửi dữ liệu học viên ra bên thứ ba

## 5. Có thể nâng cấp AI thật sau này

Sau này có thể nâng cấp thành AI Assistant thật bằng cách thêm provider:

- OpenAI
- Gemini
- Zalo OA AI flow
- Chatbot tư vấn phụ huynh trên website

Khi đó nên giữ module hiện tại làm lớp bảo vệ dữ liệu và chỉ cho AI gọi các hàm đã kiểm soát quyền.

## 6. API mới

Backend thêm module:

```txt
GET  /api/chatbot/quick-actions
POST /api/chatbot/message
```

Ví dụ body:

```json
{
  "message": "Học viên còn nợ học phí"
}
```

## 7. File đã thêm/sửa

```txt
backend/src/modules/chatbot/chatbot.routes.ts
backend/src/routes.ts
frontend/src/components/ChatbotWidget.tsx
frontend/src/components/Layout.tsx
CHATBOT_UPGRADE_GUIDE.md
```
