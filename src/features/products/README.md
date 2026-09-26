# Products — maintenance note

> **Document version:** 2.1.0
>
> **Last updated:** 2026-09-26
>
> **Change summary:** Gộp 7 tab của workspace thành 3 tab (Thông tin · SKU, giá & tồn kho · Kiểm tra xuất bản) cho cả Tạo và Sửa; Combo thành khối trong tab SKU, chỉ hiện với BUNDLE; bỏ `visibleProductTabs`.

## Workspace Tạo/Sửa

`components/product-workspace-drawer.tsx` là **nơi duy nhất** tạo và sửa sản phẩm (rộng 1040px). Mở không
có `slug` là Tạo, có `slug` là Sửa; tạo xong workspace chuyển tại chỗ sang Sửa của sản phẩm vừa tạo.
Hợp nhất ở **bố cục**, không ở API: mỗi nghiệp vụ vẫn gọi operation riêng.

Workspace có **3 tab**, giống nhau ở Tạo và Sửa; mỗi tab gộp nhiều khối xếp chồng và giữ nguyên component
riêng. Mỗi khối chỉ có **một** tiêu đề nhìn thấy: khối đã có `FormSection` tự đặt tiêu đề thì không thêm gì;
chỉ thông báo Combo lúc Tạo (không có tiêu đề riêng) được thêm `Divider` "Combo".

| Tab | Khối | Khi Tạo (ô của form, gửi một lệnh) | Khi Sửa |
| --- | --- | --- | --- |
| Thông tin | Thông tin cơ bản | `product-basic-info-tab.tsx`: loại, tên, thương hiệu, danh mục, mô tả | cùng ô, lưu bằng **Lưu** (`updateAdminProduct`) |
| | Hình ảnh | `ProductImagePicker`, gắn trong lệnh tạo | `ProductMediaPanel` — lưu ngay |
| | Thông số kỹ thuật | `product-specifications-tab.tsx`, gửi `specifications` trong lệnh tạo | cùng ô, gửi trong `updateAdminProduct` **chỉ khi đã sửa** |
| SKU, giá & tồn kho | SKU & giá | `product-variants-tab.tsx`: SKU (nhập tay/để trống), kích thước, giá ban đầu | `product-variants-manager.tsx`: bảng SKU, sửa/lưu trữ, thêm SKU, lịch giá — lưu ngay |
| | Tồn kho | `product-opening-stock-tab.tsx`: chi nhánh/kho + tồn đầu từng SKU | `product-stock-panel.tsx`: xem tồn, nút **Thử ghi tồn đầu lại** |
| | Combo (chỉ BUNDLE) | thông báo: khai sau khi tạo (cần SKU thật) | `product-bundle-manager.tsx` — lưu ngay |
| Kiểm tra xuất bản | — | tóm tắt từ `watch()` | tóm tắt + checklist `getAdminProductSetupStatus` |

Xuất bản / Lưu trữ / Đưa về nháp nằm ở header workspace (và menu của danh sách).

`model/product-form-tabs.ts` giữ bộ 3 tab (`PRODUCT_FORM_TABS`), `productTabFields` (trường theo tab gộp
và chế độ: thông tin/ảnh/thông số → `info`; SKU/giá/tồn đầu → `variants`) và `validateProductTabs` — nhảy
tới tab gộp chứa lỗi đầu tiên. Combo không còn là tab nên không cần lọc tab theo loại sản phẩm; việc ẩn/hiện
khối Combo nằm trong nội dung tab SKU. Khi Sửa không validate SKU/ảnh/tồn đầu vì đó là dữ liệu thật lưu riêng.

## Ghi chú bảo trì quan trọng

- Nút **Lưu/Tạo** ở footer gọi thẳng `submitWithTabValidation()`. `Form` dùng `component={false}` (không
  render `<form>`): các khối lưu ngay có `<form>` riêng, lồng form làm Enter ở ô con submit nhầm sản phẩm.
- Form chỉ reset khi mở workspace hoặc nạp sản phẩm **khác** (`productId`). SKU/giá/ảnh lưu ngay làm
  detail tải lại với version mới; reset theo mỗi lần đó sẽ xoá ô người dùng đang sửa dở.
- Tồn đầu là phiếu `OPENING_BALANCE` của Inventory gửi sau lệnh tạo. Lỗi thì workspace giữ payload +
  `Idempotency-Key` cũ (`PendingOpeningStock`), mở tab SKU, giá & tồn kho (khối Tồn kho); bấm ghi lại dùng đúng khoá đó nên không
  cộng tồn hai lần nếu lần đầu thực ra đã ghi. Trạng thái này chỉ sống trong phiên workspace.
- Lỗi field từ API ánh xạ về đúng ô, kể cả `variants.N.sku` và `variants.N.initialPriceAmount` → ô giá.
- Giá ban đầu kiểm bằng `INITIAL_PRICE_PATTERN` — cùng regex với API, không đi qua `Number`.
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

Các operation từ `src/generated/api/catalog/catalog.ts` (kiểu ở `catalog.schemas.ts`), gồm `useListAdminProducts`, `useGetAdminProduct`, `useCreateAdminProduct`, `useUpdateAdminProduct`, `usePublishAdminProduct`, `useArchiveAdminProduct`, `useReactivateAdminProduct`, nhóm variant (`create/update/archive/reactivate`), media (`attach/update/reorder/archive/delete`), giá (`create/replace/timeline`), bundle, `getAdminProductSetupStatus`, `listAdminAttributes`; `deleteAdminProduct` dùng cho mục Lưu trữ ở menu danh sách (lưu trữ logic).

## Quyết định đã ghi

- Publish có điều kiện: nút Xuất bản mở theo `getAdminProductSetupStatus.canPublish` (cùng policy với publish ở API). Backend vẫn kiểm tra lại.
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
- Update Product không nhúng sửa variants. Thêm/sửa/archive SKU sau create ở khối SKU & giá (tab SKU, giá & tồn kho) của
  workspace, bằng operation riêng để giữ lifecycle và optimistic version rõ ràng.
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
| `replaceAdminProductSpecifications` | Thông số đi cùng `createAdminProduct`/`updateAdminProduct` để lưu một nút như các ô khác của form. |
| `deleteAdminProductVariant` | Alias của `archiveAdminProductVariant`. |
| `archiveAdminProductMedia` | Chỉ gỡ liên kết và giữ asset; UI hiện dùng DELETE để đáp ứng yêu cầu xóa cả Cloudinary. |

Sản phẩm đã bán không được xoá cứng — dòng đơn hàng còn tham chiếu tới biến thể. Lưu trữ là hành vi đúng.

**Điều kiện gỡ ghi chú:** BE tách `DELETE` thành xoá cứng cho sản phẩm chưa từng phát sinh giao dịch.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 2.1.0 | 2026-09-26 | Gộp 7 tab thành 3 tab (Thông tin · SKU, giá & tồn kho · Kiểm tra xuất bản); Combo là khối trong tab SKU chỉ với BUNDLE; validate map lỗi về tab gộp. |
| 2.0.0 | 2026-09-26 | `ProductWorkspaceDrawer` hợp nhất Tạo/Sửa (7 tab), thông số trong create/update, retry tồn đầu, Playwright PRD-10..12. |
| 1.8.0 | 2026-09-21 | Màn tạo chia bốn tab, validate theo tab. |
| 1.6.0 | 2026-09-21 | Product Media DELETE xóa Cloudinary, refetch khi compensation và cảnh báo asset dùng chung. |
| 1.5.0 | 2026-09-20 | Cố định action footer và thêm khai báo tồn đầu theo branch/warehouse cho từng SKU. |
| 1.4.0 | 2026-09-20 | Ghép Product + initial variants vào một create drawer và mapper contract có test. |
| 1.3.0 | 2026-09-19 | Mặc định 30 sản phẩm/trang, thêm page-size selector và giữ table trong viewport. |
| 1.2.0 | 2026-09-19 | Tách ProductsPage thành page/hook/action/toolbar/table/constants/mapper và bổ sung Storybook cho bảng. |
| 1.1.0 | 2026-09-19 | Chuẩn hóa pagination và toolbar dưới bảng theo layout quản trị responsive. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
