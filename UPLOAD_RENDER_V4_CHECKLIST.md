# Checklist upload Render V4

1. GitHub root phải có `backend/`, `frontend/`, `render.yaml`, `package.json`.
2. Mở `backend/prisma/schema.prisma`, tìm thấy `PARENT`.
3. Mở `frontend/src/pages/Parents.tsx`, tìm thấy `Tạo tài khoản phụ huynh`.
4. Render: Manual Deploy -> Clear build cache & deploy.
5. Mở `/api/health`, kiểm tra version `parent-account-create-unassigned-v4`.
6. Không xóa PostgreSQL Database, `DATABASE_URL`, `JWT_SECRET`.
