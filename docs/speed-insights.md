# Vercel Speed Insights

Document version: 1.0.0  
Last updated: 2026-11-15  
Change summary: tích hợp đo Core Web Vitals một lần ở gốc ứng dụng.

- Package: `@vercel/speed-insights`; cài/cập nhật bằng Yarn, commit cả `package.json` và `yarn.lock`.
- Điểm gắn: `src/main.tsx`, import `@vercel/speed-insights/react`, chỉ bật trong production build.
- Dùng endpoint cùng origin mặc định `/_vercel/speed-insights/*`; CSP hiện tại cho phép `self`, không cần mở thêm domain.
- Sau deploy, mở project tương ứng trên Vercel → Speed Insights; nếu chưa bật, bật tại đó rồi redeploy. Kiểm tra request script/thu thập trong Network và dữ liệu sau khi có lượt truy cập thật. Không cần API key phía trình duyệt.
- Không phải công cụ load test hoặc benchmark backend. Chưa xác nhận dữ liệu live cho lần tích hợp này.

## Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0.0 | 2026-11-15 | Thêm Speed Insights ở gốc ứng dụng, không đổi API nghiệp vụ. |
