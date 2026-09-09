# Controlled frontend structure — Admin

> **Version:** 1.0.0  
> **Updated:** 2026-09-08  
> **Summary:** Quyết định kế thừa có kiểm soát từ admin-client và dragonx-employer-web.

| Nguồn tham khảo | Điểm kế thừa | Cách áp dụng tại Sport Admin |
| --- | --- | --- |
| `admin-client` | Sidebar/header, menu theo nghiệp vụ, generated API, active-search Select, form/drawer | Admin shell hiện tại; route permission; Orval React Query; form/action component theo feature |
| `dragonx-employer-web` | Feature chia components/constants/hooks/utils, lazy route, Storybook | Chỉ tạo lớp cần dùng; lazy import public feature index; component reviewable có story |
| Backend Java tham khảo | Permission + scope tách query/command | List dùng `.view`, mutation dùng `.manage`; Backend kiểm tra branch scope |

## Ranh giới

- `app/`: router, navigation và global store.
- `layouts/`: shell sidebar/header/outlet.
- `features/<domain>/pages`: query orchestration và page state.
- `features/<domain>/components`: table, drawer, form theo domain.
- `features/<domain>/constants`: label/color/options, không chứa server business rule.
- `foundation/`: thành phần dùng xuyên nhiều feature; không đẩy component domain vào đây để “dùng chung” giả.
- `generated/`: output Orval, tuyệt đối không sửa tay.

Shipping consultation là mẫu chuẩn. Tên feature/route phản ánh đúng aggregate hiện có; không đặt là Order CRUD khi Backend chưa có Order/Payment/Fulfillment Sprint 4. Redux chỉ giữ layout/global client state; server state dùng React Query generated hooks, không nhân đôi bằng saga.
