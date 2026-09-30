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
        <Button
          type="text"
          shape="circle"
          size="small"
          aria-label="Trợ lý Copilot"
          icon={<RobotOutlined />}
          onClick={() => { setMounted(true); setOpen(true); }}
          className={className}
        />
      </Tooltip>
      {mounted && (
        <Suspense fallback={null}>
          <CopilotDrawer open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
