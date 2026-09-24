# Returns & refunds

> **Version:** 1.0.0
> **Updated:** 2026-09-24
> **Summary:** Hàng đợi đổi trả, duyệt, nhận & kiểm hàng, hoàn tiền có chứng từ và tạo phiếu hộ khách từ chi tiết đơn.

## Phạm vi

- Route `/returns`, menu `Đổi trả` (nhóm bán hàng); route và menu cùng yêu cầu `return.view`.
- Khối `OrderReturnPanel` trong chi tiết đơn (feature `orders` import qua barrel) cho nhân viên tạo phiếu hộ khách gọi hotline (D55).
- Công tắc `returnable` của danh mục nằm ở `catalog-masters` (D54).
- Ngoài phạm vi: màn khách tự tạo phiếu (Storefront), báo cáo tỷ lệ trả, tồn kho hàng lỗi.

## Generated API

`src/generated/api/returns/returns.ts`: `useListAdminReturns`, `useGetAdminReturn`, `useGetAdminReturnQueueSummary`,
`useGetAdminReturnEligibility`, `createAdminReturn`, `approveAdminReturn`, `rejectAdminReturn`, `cancelAdminReturn`,
`receiveAdminReturn`, `closeAdminReturn`, `requestAdminReturnRefund`, `confirmAdminReturnRefund`, `failAdminReturnRefund`,
`createAdminReturnEvidenceUpload`, `createAdminReturnRefundProofUpload`. Các lệnh ghi dùng `apiFetcherWithOptions`
(khai trong `orval.config.ts`) để gửi `Idempotency-Key`.

## Quyền và trạng thái

| Thao tác | Quyền | Trạng thái |
| --- | --- | --- |
| Duyệt / Từ chối | `return.decide` | REQUESTED |
| Huỷ | `return.decide` | REQUESTED, APPROVED |
| Nhận & kiểm hàng | `return.receive` | APPROVED |
| Tạo lượt hoàn | `payment.refund.request` | RECEIVED, không có lượt PENDING, còn tiền hoàn |
| Xác nhận / Đánh lỗi lượt hoàn | `payment.refund.approve` | RECEIVED có lượt PENDING |
| Đóng | `return.decide` | RECEIVED, REFUNDED, không có lượt PENDING |
| Tạo phiếu hộ | `return.create` (+ `return.decide` thì duyệt ngay, + `return.window.override` khi quá hạn) | đơn đủ điều kiện |

Quy tắc nằm ở `model/return-actions.policy.ts`. Đây chỉ là affordance: API kiểm lại mọi lệnh và trả 409 nếu lệch.

## State và cache

- Server state: TanStack Query. Form: AntD `Form.useForm` trong từng modal. Bộ lọc trạng thái và phiếu đang mở nằm trên URL (`?status=&id=`).
- Mọi lệnh gửi `expectedVersion` của lần tải gần nhất. `RETURN_VERSION_CONFLICT` → tải lại chi tiết (`hooks/use-return-command.ts`).
- Idempotency-Key giữ nguyên khi gửi lại cùng nội dung, sinh mới khi nội dung đổi (`nextIdempotencyKey`).
- Sau lệnh thành công: chi tiết lấy từ response; invalidate danh sách và ô đếm. Tạo phiếu còn invalidate eligibility của đơn.

## Ảnh

- `lib/media/upload-signed-image.ts` tải ảnh thẳng lên Cloudinary bằng chữ ký của API; không có bước finalize, API xác minh
  ảnh trong chính lệnh tạo phiếu / xác nhận hoàn tiền. Tối đa 5 ảnh.
- Ảnh chứng từ hoàn tiền dùng để đối chiếu sau này; khách không xem được (API trả rỗng cho khách).
- Huỷ modal sau khi đã tải ảnh thì ảnh nằm lại trên Cloudinary nhưng không gắn vào phiếu nào.

## Mapping

`model/return-form.mapper.ts`: form kiểm hàng → `InspectReturnItemDto[]` (id lấy theo thứ tự dòng của phiếu, chỉ gửi
`disposition` cho hàng hỏng), form tạo phiếu → `CreateAdminReturnDto` (combo gửi đúng số còn trả được), ước tính tiền.
Tiền nhập bằng `MoneyInput` (số) và đổi sang chuỗi thập phân khi gửi.

## Test và evidence

- `model/return-actions.policy.test.ts`, `model/return-form.mapper.test.ts`.
- Story: `components/return-table.stories.tsx` (mặc định, loading, rỗng).
- Chưa có test giao diện cho các modal; chưa chạy thử với API thật trên trình duyệt.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-24 | Tạo feature Returns Admin V1. |
