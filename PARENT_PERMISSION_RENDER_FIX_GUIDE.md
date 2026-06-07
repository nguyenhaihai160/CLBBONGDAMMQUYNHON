# Nâng cấp phân quyền Phụ huynh - GitHub + Render

## Điểm mới
- Sidebar Admin hiển thị menu **Phân quyền tài khoản** rõ ràng.
- Trang phân quyền có ba thẻ quyền: Admin, Huấn luyện viên, **Phụ huynh**.
- Admin có thể tạo tài khoản Phụ huynh và gán con ngay khi tạo.
- Admin có thể đổi tài khoản đã có sang vai trò Phụ huynh rồi gán con.
- Menu **Tài khoản phụ huynh** vẫn giữ để quản lý chuyên sâu danh sách phụ huynh.

## Cập nhật Render đang dùng
1. Giải nén bản ZIP này.
2. Copy toàn bộ source mới vào repository GitHub đang nối với Render, giữ thư mục `.git`.
3. Commit và Push lên branch mà Render đang deploy, thường là `main`.
4. Trên Render chọn `Manual Deploy` → `Deploy latest commit` nếu Auto-Deploy đang tắt.
5. Không xóa PostgreSQL Database và không đổi `DATABASE_URL` nếu cần giữ dữ liệu cũ.

## Kiểm tra sau deploy
- Đăng nhập Admin.
- Vào menu **Phân quyền tài khoản**.
- Phải thấy ô lựa chọn **Phụ huynh** cạnh Admin và Huấn luyện viên.
- Tạo mới hoặc bấm **Đổi quyền** trên tài khoản hiện có → chọn **Phụ huynh** → chọn con → Lưu quyền.
