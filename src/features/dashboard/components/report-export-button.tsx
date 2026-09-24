import { DownloadOutlined } from '@ant-design/icons';
import { App, Button, Dropdown } from 'antd';
import { useState } from 'react';
import { downloadFile } from '@/lib/api/download';
import { getApiErrorMessage } from '@/lib/api/error';

/**
 * Nút tải một báo cáo ra CSV hoặc XLSX.
 *
 * Gọi thẳng endpoint export thay vì dựng file từ dữ liệu đã tải về màn hình: dữ liệu trên màn chỉ
 * là phần đang hiển thị (top 5, một trang), còn file phải là toàn bộ khoảng đang xem. Dựng ở client
 * sẽ cho ra một file trông đúng nhưng thiếu dòng.
 */
export function ReportExportButton({
  path,
  params,
  fallbackFilename,
  disabled,
  label = 'Tải báo cáo',
}: {
  /** Đường dẫn endpoint export, ví dụ `/api/v1/admin/reports/revenue/export`. */
  path: string;
  params: Record<string, string | number | undefined>;
  /** Tên dùng khi server không gửi `Content-Disposition` (proxy lược header chẳng hạn). */
  fallbackFilename: string;
  disabled?: boolean;
  label?: string;
}) {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState<'CSV' | 'XLSX'>();

  const run = async (format: 'CSV' | 'XLSX') => {
    setDownloading(format);
    try {
      const { filename } = await downloadFile(
        { url: path, method: 'GET', params: { ...params, format } },
        `${fallbackFilename}.${format.toLowerCase()}`,
      );
      void message.success(`Đã tải ${filename}`);
    } catch (error) {
      // Thân lỗi của endpoint tải file là Blob; `apiFetcher` đã bóc sẵn thành JSON nên thông báo
      // ở đây là lý do thật (hết quyền, khoảng thời gian sai), không phải "[object Blob]".
      void message.error(getApiErrorMessage(error, 'Không tải được báo cáo.'));
    } finally {
      setDownloading(undefined);
    }
  };

  return (
    <Dropdown
      disabled={disabled || Boolean(downloading)}
      menu={{
        items: [
          { key: 'XLSX', label: 'Tải Excel (.xlsx)' },
          { key: 'CSV', label: 'Tải CSV (.csv)' },
        ],
        onClick: ({ key }) => void run(key as 'CSV' | 'XLSX'),
      }}
    >
      <Button icon={<DownloadOutlined />} loading={Boolean(downloading)} disabled={disabled}>
        {label}
      </Button>
    </Dropdown>
  );
}
