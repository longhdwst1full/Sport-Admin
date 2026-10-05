# Content — maintenance note

> **Document version:** 3.3.0
>
> **Last updated:** 2026-10-05
>
> **Change summary:** Lỗi thao tác banner/social chuyển sang toast AntD; danh sách/chi tiết bài social ẩn "lỗi gần nhất" khi Facebook đang xử lý video. Trước đó: Ảnh bìa bài viết gửi `coverAssetId` khi là asset thư viện (`model/content-post-cover.ts`), ảnh lỗi/rỗng hiện `IMAGE_FALLBACK_SRC`, ẩn loại đăng Video/Reel khi soạn bài Facebook. Trước đó: Thêm màn Banner `/banners` (CMS-02): danh sách lọc vị trí/trạng thái, drawer tạo/sửa (ảnh desktop/mobile, lịch hiển thị, CTA, danh mục cho CATEGORY_TOP), xuất bản/gỡ/lưu trữ theo expectedVersion. Trước đó: `listAdminPosts` chuyển sang phân trang server-side (`page`/`limit`/`meta`) và item trong list không còn `body`/`relatedProductSlugs`; form sửa bài phải tải bản đầy đủ qua `getAdminPost`.

## Phạm vi

Tạo/liệt kê/xoá bài viết nội dung (`Admin Content`).

## Ranh giới

`pages/content-page.tsx` (list + filter) → `components/content-editor-drawer.tsx` (soạn thảo, nạp lazy).

## Generated operation

`useListAdminPosts`, `useGetAdminPost`, `useCreateAdminPost`, `useUpdateAdminPost`, `useDeleteAdminPost` — `src/generated/api/content`.

`useListAdminPosts` trả `{ items: ContentPostSummaryDto[], meta: { page, limit, total, hasMore } }`;
`ContentPostSummaryDto` không có `body`/`relatedProductSlugs`. Form sửa bài (`content-editor-drawer.tsx`)
gọi `useGetAdminPost(id)` để lấy `ContentPostDto` đầy đủ trước khi đổ vào form — không đọc `body` từ
row của bảng nữa.

## Dữ liệu đã bền

Bài viết lưu ở bảng `posts` qua Prisma (`api/src/modules/cms/cms.service.ts`). Cảnh báo "in-memory,
mất khi restart" của bản trước đã không còn đúng.

## Trạng thái bài viết

Bảng `posts` có sẵn `status`, `is_published`, `published_at`, `archived_at`, `archive_reason` —
nghĩa là schema đã đỡ được vòng đời Nháp → Xuất bản → Lưu trữ.

| Việc | Trạng thái |
| --- | --- |
| Lưu bền vào database | Có |
| Cờ `isPublished` tách khỏi `status` | Có — ẩn tạm một bài không cần đẩy về nháp |
| Chuyển trạng thái có tên (publish/archive) như Product | **Chưa** — hiện chỉ sửa trực tiếp |
| Phân trang phía server (`page`/`limit`) | Có |
| Tìm kiếm/lọc phía server (ngoài `postType`) | **Chưa** |

Đừng mô tả màn này là đã có quy trình duyệt bài; nó mới là CRUD trên dữ liệu bền.

## Banner (`/banners`)

- `pages/banners-page.tsx`, `components/banner-editor-drawer.tsx`, `components/banner-status-modal.tsx`, hook
  `use-banner-commands.ts`; generated operation `listAdminBanners`, `getAdminBanner`, `createAdminBanner`,
  `updateAdminBanner`, `setAdminBannerStatus`. Đọc `cms.content.view`, ghi `cms.content.manage`.
- Ảnh chọn qua `ImageUploadField` (media asset id); API từ chối ảnh không ACTIVE. ARCHIVED là trạng thái cuối.
- 409 `CMS_BANNER_VERSION_STALE` → tải lại banner. Storefront chỉ hiện banner PUBLISHED trong khung giờ.

## Ảnh bìa và ảnh Facebook

- `toCoverPayload`: ảnh vừa upload (có asset id) gửi `coverAssetId`, API tự lấy URL của asset; URL dán tay gửi `coverUrl`
  (API chỉ nhận https trên host storefront render được — 400 `CMS_COVER_URL_NOT_ALLOWED`). Sửa bài mà ảnh bìa không
  đổi thì không gửi trường ảnh.
- Mọi `Image` của antd ở content/media dùng `fallback={IMAGE_FALLBACK_SRC}` (export từ `features/media`).
- Soạn bài Facebook chỉ chọn được Bài viết/Ảnh (`composablePublishTypeOptions`) vì upload media chỉ nhận ảnh; bài đang là
  Video/Reel vẫn hiện đúng loại. Mở lại Video/Reel khi có upload video.

## Lỗi thao tác và trạng thái xử lý video

- Banner editor/status modal và social action modal/editor báo lỗi mutation bằng toast AntD `message`, không dùng `<Alert type="error">` inline (quy ước ở rule `03-antd-tailwind-ui`).
- `social-post-detail-drawer.tsx` và danh sách bài social ẩn UI "lỗi gần nhất" khi Facebook đang xử lý video, để không hiện lỗi cũ khi bài đang chạy lại.

## Checklist khi sửa

- [ ] Ảnh bìa đi qua `features/media`, không nhập URL tự do.
- [ ] Xoá bài phải có xác nhận.
- [ ] Thêm chuyển trạng thái thì làm bằng use case có tên ở Backend, không patch thẳng cột `status`
      (rule `03-transitions-idempotency`).

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 3.3.0 | 2026-10-05 | Lỗi thao tác banner/social dùng toast; ẩn "lỗi gần nhất" khi Facebook đang xử lý video. |
| 3.2.0 | 2026-10-03 | `coverAssetId` cho ảnh bìa, fallback ảnh lỗi, ẩn Video/Reel khi soạn bài Facebook. |
| 3.1.0 | 2026-10-02 | Thêm màn Banner `/banners` (CMS-02): danh sách lọc vị trí/trạng thái, drawer tạo/sửa (ảnh desktop/mobile, lịch hiển thị, CTA, danh mục cho CATEGORY_TOP), xuất bản/gỡ/lưu trữ theo expectedVersion. |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo CMS in-memory. |
| 2.0.0 | 2026-09-21 | Gỡ cảnh báo in-memory; ghi lại vòng đời bài viết hiện có và phần còn thiếu. |
| 3.0.0 | 2026-09-29 | `listAdminPosts` phân trang server-side, list item chỉ còn summary; form sửa bài tải đầy đủ qua `getAdminPost`. |
