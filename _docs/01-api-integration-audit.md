# Admin API integration audit

> **Version:** 1.0.0  
> **Updated:** 2026-09-08  
> **Summary:** Rà API Admin, quyền route/action và chuẩn hóa feature tư vấn giao hàng.

## Kết luận

- Các màn Catalog, Inventory, IAM, Organization, CMS, Review, Audit và Shipping consultation dùng generated SDK từ OpenAPI.
- Media upload gọi Backend lấy signed upload trước rồi mới dùng Axios gửi binary tới Cloudinary; đây là provider upload, không phải endpoint nghiệp vụ viết tay.
- `src/features/shipping-consultations` được tách `constants/`, `components/`, `pages/` và `index.ts`; route canonical là `/shipping-consultations`. `/orders` chỉ redirect tương thích, tránh gọi checkout consultation là Order CRUD khi Sprint 4 chưa có Order aggregate.
- List consultation yêu cầu `order.view`; nút cập nhật yêu cầu `order.manage`. FE chỉ ẩn/khóa action để UX đúng, Backend vẫn là security boundary.

## Ma trận hiện trạng

| Vùng | Nguồn dữ liệu | Trạng thái |
| --- | --- | --- |
| Product/variant/price/media | Generated SDK | Đã ghép |
| Brand/category | Generated SDK + active search endpoint | Đã ghép |
| Inventory/transfer/movement | Generated SDK | Đã ghép |
| Staff/role/assignment/branch | Generated SDK + active search endpoint | Đã ghép |
| Shipping consultation | Generated SDK | Đã ghép Sprint 3 |
| Order/payment/fulfillment CRUD | Chưa có aggregate API Sprint 4 | Chưa được coi là Done |
| Customer management | Fixture vì thiếu Admin customer list API | Cần thay khi Backend contract có |

## Quy tắc tiếp tục

1. Backend cập nhật OpenAPI trước; Admin chạy `yarn contracts:sync && yarn generate:api`.
2. Không sửa `src/generated/api` bằng tay và không tự đoán DTO.
3. Search Select dùng endpoint `/active/search`; list quản trị dùng endpoint phân trang đầy đủ, không dùng chung sai mục đích.
4. `pages/` giữ query/orchestration; `components/` giữ table/drawer/form; `constants/` giữ presentation map/options; foundation chỉ chứa thành phần dùng xuyên feature.
5. Mỗi component/layout reviewable phải có Storybook state phù hợp; table consultation đã có loading/empty/data story.
