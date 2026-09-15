# POS — Bán tại quầy — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-15
>
> **Change summary:** Chuyển sang danh mục bán tại quầy có combo và tồn khả dụng theo chi nhánh.

## Phạm vi

Lập đơn cho khách mua trực tiếp tại cửa hàng. Một lần bấm "Thu tiền và giao hàng" là
Backend chạy trọn: tạo phiên checkout → giữ hàng → đặt đơn → ghi nhận đã thu → giao tại chỗ.
Đơn kết thúc ở `DELIVERED` với thanh toán `SUCCESS` và kênh `STORE`.

Ngoài phạm vi: sửa/huỷ đơn đã bán (dùng màn Đơn hàng), trả hàng, nhập kho.

## Ranh giới và contract

- `pages/pos-page.tsx` sở hữu giỏ, thông tin khách, khoá chống trùng và gọi `useCreatePosOrder`.
- `model/pos-cart.ts` là hàm thuần trên giỏ; không gọi API, không giữ state.
- `components/pos-product-picker.tsx` tìm hàng qua `useSearchPosCatalog` — danh mục riêng của
  quầy, trả cả combo và tồn khả dụng theo kho của chi nhánh đang bán. **Không** dùng lookup
  biến thể dùng chung của catalog: lookup đó cố tình loại combo ra vì nó phục vụ việc chọn
  thành phần combo, và nó không biết chi nhánh nào đang bán.
- `components/pos-receipt-modal.tsx` in từ `OrderDetailDto` Backend trả về, **không** dựng lại
  từ giỏ trên màn hình: thứ khách cầm về phải khớp đơn đã ghi sổ.
- Mọi request dùng `src/generated/api`; không hard-code URL, không sửa file generated.
- Endpoint yêu cầu quyền `order.manage`; route FE gate cùng quyền chỉ để cải thiện UX.
- `branchId` bắt buộc với tài khoản phạm vi toàn hệ thống. Panel chỉ liệt kê chi nhánh
  `ACTIVE` — chi nhánh đã ngừng vẫn còn trong dữ liệu để đọc lại lịch sử.
- Khoá chống trùng (`Idempotency-Key`) sinh mới cho **mỗi đơn**, không phải mỗi lần mở màn:
  bấm hai lần cho cùng một đơn thì Backend trả lại đúng đơn đó, đơn kế tiếp là giao dịch mới.

## Quyết định đáng lưu ý

- Giá hiển thị trên giỏ chỉ để nhân viên đối chiếu với khách. Số tiền cuối cùng do Backend
  tính lại khi tạo đơn; màn này không phải nguồn giá.
- Biến thể chưa có giá hiệu lực bị chặn ngay trên UI thay vì để Backend từ chối cả đơn sau
  khi nhân viên đã nhập xong thông tin khách.

## Tồn kho và combo

- Tồn hiển thị là **khả dụng** (`onHand - reserved`) tại kho của chi nhánh đang bán.
- Combo không có dòng tồn riêng — tồn nằm ở thành phần, và bước đặt chỗ cũng nổ combo ra
  thành phần trước khi giữ hàng. Nên combo lấy theo **thành phần thiếu nhất**:
  `min(floor(tồn thành phần / số lượng trong combo))`.
- Con số này là **ảnh chụp lúc chọn hàng**, không phải chỗ đã giữ. Backend vẫn kiểm lại khi
  tạo đơn; UI chặn sớm chỉ để nhân viên không nhập xong thông tin khách rồi mới biết hỏng.
- Đổi chi nhánh là đổi kho nên giỏ bị xoá: giữ lại sẽ cho bán thứ kho mới không có.

## Checklist khi sửa

- [ ] Giữ đủ loading/error/empty của picker và trạng thái chặn của nút thu tiền.
- [ ] Không dựng lại biên lai từ state màn hình.
- [ ] Đổi hình thức thanh toán phải sửa `CreatePosOrderDto` ở Backend trước rồi regenerate SDK.
- [ ] Khoá chống trùng phải reset sau mỗi đơn bán xong.
- [ ] Nhãn tiếng Việt tách khỏi mã nghiệp vụ trong `constants/pos.constants.ts`.
- [ ] Đổi cách tính tồn phải sửa `PosOrderService.computeAvailable` ở Backend, không tính lại ở FE.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.1.0 | 2026-09-15 | Dùng `searchPosCatalog`: combo và tồn khả dụng theo chi nhánh, chặn bán vượt tồn ngay trên UI. | POS-20260915-CATALOG |
| 1.0.0 | 2026-09-15 | Tạo màn bán tại quầy từ generated contract `createPosOrder`. | POS-20260915-COUNTER-SALES |
