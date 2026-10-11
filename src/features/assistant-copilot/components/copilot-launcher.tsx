import { lazy, Suspense, useState } from 'react';
import { RobotOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useCanAll } from '@/core/auth/permissions';
import { COPILOT_LAUNCH_PERMISSIONS } from '../constants/copilot.constants';

// Nạp lười: drawer kéo theo nhãn trạng thái của orders/payments/inventory; header không cần tải chúng trước.
const CopilotDrawer = lazy(() => import('./copilot-drawer').then((module) => ({ default: module.CopilotDrawer })));

/**
 * Nút "Trợ lý Copilot" trên header. PERMISSION: chỉ hiện khi có ĐỦ `assistant.use` và
 * `assistant.tool.execute`; API vẫn là nơi quyết định cuối.
 */
export function CopilotLauncher({ className }: { className?: string }) {
  const allowed = useCanAll(COPILOT_LAUNCH_PERMISSIONS);
  const [open, setOpen] = useState(false);
  // Giữ drawer đã gắn sau lần mở đầu để đóng/mở lại không mất hội thoại đang dở.
  const [mounted, setMounted] = useState(false);
  if (!allowed) return null;

  return (
    <>
      <Tooltip title="Trợ lý Copilot">
        {/* Có chữ + màu nhấn: icon xám 28px trước đây trông như icon tài liệu, người dùng không nhận ra. */}
        <Button
          size="small"
          shape="round"
          aria-label="Trợ lý Copilot"
          icon={<RobotOutlined />}
          onClick={() => { setMounted(true); setOpen(true); }}
          className={`!border-emerald-200 !bg-emerald-50 !font-medium !text-emerald-700 hover:!border-emerald-300 hover:!bg-emerald-100 ${className ?? ''}`}
        >
          <span className="hidden sm:inline">Trợ lý AI</span>
        </Button>
      </Tooltip>
      {mounted && (
        <Suspense fallback={null}>
          <CopilotDrawer open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
