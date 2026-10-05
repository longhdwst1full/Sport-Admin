import { ExportOutlined, SyncOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

export const VIDEO_PROCESSING_HINT =
  'Hệ thống tự kiểm tra mỗi 5 phút và cập nhật khi Facebook xử lý xong; video gốc trên Cloudinary sẽ được xoá sau khi đăng thành công.';

export function FacebookVideoProcessingTag() {
  return (
    <Tooltip title={VIDEO_PROCESSING_HINT}>
      <Tag color="processing" icon={<SyncOutlined spin />}>
        Facebook đang xử lý video
      </Tag>
    </Tooltip>
  );
}

export function FacebookPermalink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">
      <ExportOutlined /> Xem trên Facebook
    </a>
  );
}
