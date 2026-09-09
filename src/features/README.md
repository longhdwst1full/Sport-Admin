# Admin features — maintenance guide

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-09
>
> **Change summary:** Bổ sung bản đồ feature, ranh giới thư mục và checklist bảo trì cho Sport Admin.

## Luồng phụ thuộc chuẩn

```text
app route/navigation
  → feature page
    → feature component / mapper / policy
      → generated React Query hook
        → shared Axios transport
```

- `pages` điều phối query, filter, selection và trạng thái toàn trang; không chứa DTO mapping lớn.
- `components` chứa table/form/drawer/modal thuộc một domain.
- `mappers` chuyển generated DTO ↔ form/view model và nên là pure function có test.
- `policies` quyết định action nào được hiển thị/disabled từ permission và lifecycle; Backend vẫn là nơi authorize cuối cùng.
- `constants` chỉ chứa label, option, màu và cấu hình UI; không sao chép business rule từ Backend.
- `src/generated/api` là output Orval, tuyệt đối không sửa hoặc thêm comment bằng tay.

## Bản đồ feature hiện tại

| Feature | Trách nhiệm | Chú ý khi bảo trì |
| --- | --- | --- |
| `auth` | Login và đổi mật khẩu bắt buộc | Token/session thuộc transport store; không đặt trong Redux server cache. |
| `access` | User, role assignment và lifecycle nhân viên | Mọi mutation cần permission, branch scope, optimistic version và confirmation. |
| `organization` | Branch + warehouse 1:1 | Không tách thành hai form độc lập trong V1. |
| `catalog-masters` | Brand/category CRUD lifecycle | Dropdown tạo sản phẩm dùng active-search API, không dùng list quản trị. |
| `products` | Product, variant, price, media, combo | Là feature lớn; mapper/policy tách riêng và editor/media giữ lazy boundary. |
| `inventory` | Balance, movement, adjustment, transfer | Không sửa balance trực tiếp; UI gửi command và idempotency key. |
| `shipping-consultations` | Nhân viên chốt phí/ETA giao riêng | Đây là Checkout consultation, chưa phải Order CRUD. Xem README trong feature. |
| `content` / `reviews` | Nội dung và kiểm duyệt | CKEditor chỉ thuộc Content; lifecycle dùng action có xác nhận. |
| `audit` | Nhật ký nhạy cảm | Chỉ đọc, server pagination; không expose dữ liệu đã redact. |
| `dashboard` / `customers` | Tổng quan và customer view | Kiểm tra rõ API-backed hay fixture trước khi coi là hoàn thành. |
| `media` | Thành phần upload dùng trong feature | Không tự sở hữu trang nghiệp vụ nếu chỉ là adapter UI. |
| `shared` | Placeholder/composition có chủ đích | Không biến thành nơi chứa component dùng chung không rõ ownership. |

## Khi nào cần comment

Comment/JSDoc chỉ nên giải thích một trong các nội dung sau:

- Vì sao query phải tuần tự, debounce hoặc invalidate theo key cụ thể.
- Vì sao action bị ẩn/disabled do permission, branch scope hoặc state transition.
- Mapping khác tên giữa form và generated DTO.
- Workaround có link issue, điều kiện gỡ bỏ và owner.

Không comment lại JSX như “render button”, “set loading”. Tên component/hàm phải tự mô tả được ý định.

## Checklist khi sửa feature

- [ ] Route lazy-load từ public entry của feature.
- [ ] Loading, empty, error, forbidden, success và disabled state đầy đủ.
- [ ] API chỉ đi qua generated hook; không gọi Axios/URL trực tiếp trong page/component.
- [ ] Form phức tạp dùng React Hook Form/Yup; field bắt buộc có dấu `*`.
- [ ] Server error map đúng field; toast không hiển thị request/trace ID cho người dùng.
- [ ] Query list/search do server pagination/filter; input search có debounce/cancel.
- [ ] Mutation lifecycle có permission gate, confirm và invalidation/refetch phù hợp.
- [ ] Component có giá trị tái sử dụng/review trực quan được thêm Storybook story.
- [ ] Nếu API contract đổi: sync contract và regenerate; không sửa generated output.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-09 | Tạo bản đồ và quy tắc maintenance cho Admin features. | DOC-20260909-FEATURE-MAINTENANCE-NOTES |
