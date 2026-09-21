# Products — maintenance note

> **Document version:** 1.7.0
>
> **Last updated:** 2026-09-21
>
> **Change summary:** Form sửa sản phẩm hiển thị luôn ảnh và lịch giá; nút Lưu gọi thẳng submit thay vì nối qua thuộc tính `form`; drawer thu về 720px.

## Ghi chú bảo trì quan trọng

- Nút **Lưu/Tạo** ở footer Drawer gọi thẳng `submit()`. Không nối lại bằng `htmlType="submit"` +
  `form="product-form"`: nút nằm ngoài thẻ `<form>`, và khi thuộc tính `id` không xuống tới DOM thì
  nút trông vẫn bình thường nhưng bấm không có gì xảy ra.
- Ở chế độ **Sửa**, `ProductMediaPanel` và `ProductPricePanel` nằm ngay trong form. Hai khối này ghi
  qua API riêng của chúng (media/price) chứ **không** đi qua nút Lưu — mỗi thao tác có version và
  điều kiện hợp lệ riêng. Sau khi chúng ghi xong, form đọc lại chi tiết để version gửi lần sau
  không còn cũ.
- Mọi hộp xác nhận dùng `App.useApp().modal`, không dùng `Modal.confirm` tĩnh: với React 19, static
  method của antd không render nếu thiếu patch tương thích, làm `onOk` không bao giờ chạy.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| CRUD sản phẩm, variant, bundle, giá, media; publish/archive | Brand/Category — thuộc `features/catalog-masters` |
| Khai báo tồn đầu khi onboarding Product/SKU | Ledger, điều chỉnh và chuyển kho — thuộc `features/inventory` |

## Ranh giới

| Tầng | File |
| --- | --- |
| `pages/` | `products-page.tsx` — chỉ compose trang, toolbar, table và drawer |
| `hooks/` | `use-product-list.ts` sở hữu query/filter/pagination; `use-product-list-actions.tsx` sở hữu permission, mutation, confirm và cache invalidation |
| `components/` | `product-list-toolbar`, `product-list-table` và các drawer/panel nghiệp vụ |
| `constants/` | Hằng số page size của danh sách, không đặt trong page/hook/component |
| `model/` | `product-list.mapper.ts` tạo view model bất biến; policy/mapper nghiệp vụ khác đều có `.test.ts` |

Import từ ngoài chỉ qua `index.ts`.

## Generated operation

Các operation từ `src/generated/api/catalog`, gồm `useListAdminProducts`, `useGetAdminProduct`, `useCreateAdminProduct`, `useUpdateAdminProduct`, `usePublishAdminProduct`, `useArchiveAdminProduct`, `useReactivateAdminProduct`, nhóm variant (`create/update/archive/reactivate`), media (`attach/update/reorder/archive/delete`), giá (`create/replace/timeline`) và bundle.

## Quyết định đã ghi

- Publish có điều kiện: `isProductPublishReady` kiểm tra đủ variant/giá/media trước khi mở nút. Backend vẫn kiểm tra lại.
- Media reorder tính ở `product-media.policy.ts` để việc kéo thả không phụ thuộc thứ tự trả về của API.
- Nút **Xóa ảnh** gọi `deleteAdminProductMedia`: Backend chỉ xóa Cloudinary khi asset không còn
  được nơi khác sử dụng. `archiveAdminProductMedia` vẫn là operation gỡ liên kết nhưng hiện không
  được dùng bởi UI. Khi provider lỗi, FE refetch detail vì Backend compensation tăng Product version.
- Giá dùng Decimal dạng chuỗi; không parse sang `number` để tính toán (`09-data-transformation.md`).
- Không mang Redux/Saga và provider tree từ module tham khảo sang feature này. TanStack Query tiếp tục là nguồn server state duy nhất; local state chỉ giữ filter/pagination/UI selection.
- JSX bảng không đọc trực tiếp generated DTO; `toProductListRow` là biên chống contract lan vào presentation.
- Tạo mới dùng `createAdminProduct` aggregate: thông tin Product và 1–50 initial variants
  nằm trong cùng form/request. Backend commit/rollback Product, category, SKU và audit atomic;
  FE không gọi tuần tự create Product rồi create Variant.
- Edit Product metadata không nhúng sửa variants. Thêm/sửa/archive SKU sau create tiếp tục ở
  workflow drawer bằng operation riêng để giữ lifecycle và optimistic version rõ ràng.
- Product không thuộc riêng một branch. Form chỉ chọn branch/warehouse cho phiếu tồn đầu của từng
  SKU; V1 một branch có đúng một warehouse.
- Product + initial variants commit atomic ở Catalog. Tồn đầu được ghi ngay sau đó bằng operation
  Inventory `OPENING_BALANCE` có idempotency key. Nếu bước này lỗi, Product vẫn ở DRAFT và FE báo
  partial success để người dùng không submit lại tạo trùng Product.
- Combo không có tồn vật lý riêng; khả năng bán được suy ra từ các SKU thành phần.
- Nút Lưu/Hủy nằm ở footer cố định của Drawer; không đặt ở header vì nested drawer/viewport hẹp có
  thể làm action tràn khỏi vùng nhìn thấy.

## Checklist khi sửa

- [ ] Sửa điều kiện publish phải cập nhật `product-workflow.policy.test.ts`.
- [ ] Mutation gửi `expectedVersion`; xung đột version hiển thị rõ, không im lặng ghi đè.
- [ ] Không đọc trực tiếp field DTO trong JSX — đi qua mapper.


## Operation generated nhưng không gọi (RULE-CTR-06)

| Operation | Lý do |
| --- | --- |
| `deleteAdminProduct` | Alias của `archiveAdminProduct` (`changeStatus → ARCHIVED`). Nút **Lưu trữ** ở workflow drawer đã dùng bản `archive`. |
| `deleteAdminProductVariant` | Alias của `archiveAdminProductVariant`. |
| `archiveAdminProductMedia` | Chỉ gỡ liên kết và giữ asset; UI hiện dùng DELETE để đáp ứng yêu cầu xóa cả Cloudinary. |

Sản phẩm đã bán không được xoá cứng — dòng đơn hàng còn tham chiếu tới biến thể. Lưu trữ là hành vi đúng.

**Điều kiện gỡ ghi chú:** BE tách `DELETE` thành xoá cứng cho sản phẩm chưa từng phát sinh giao dịch.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.6.0 | 2026-09-21 | Product Media DELETE xóa Cloudinary, refetch khi compensation và cảnh báo asset dùng chung. |
| 1.5.0 | 2026-09-20 | Cố định action footer và thêm khai báo tồn đầu theo branch/warehouse cho từng SKU. |
| 1.4.0 | 2026-09-20 | Ghép Product + initial variants vào một create drawer và mapper contract có test. |
| 1.3.0 | 2026-09-19 | Mặc định 30 sản phẩm/trang, thêm page-size selector và giữ table trong viewport. |
| 1.2.0 | 2026-09-19 | Tách ProductsPage thành page/hook/action/toolbar/table/constants/mapper và bổ sung Storybook cho bảng. |
| 1.1.0 | 2026-09-19 | Chuẩn hóa pagination và toolbar dưới bảng theo layout quản trị responsive. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
