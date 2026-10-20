import { lazy, Suspense, useState } from 'react';
import { RobotOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useCanAll } from '@/core/auth/permissions';
import { COPILOT_LAUNCH_PERMISSIONS } from '../constants/copilot.constants';

// Nạp lười: drawer kéo theo nhãn trạng thái của orders/payments/inventory; header không cần tải chúng trước.
const CopilotDrawer = lazy(() => import('./copilot-drawer').then((module) => ({ default: module.CopilotDrawer })));

/**
 * Nút "Trợ lý Copilot" nổi góc dưới phải (giống storefront). PERMISSION: chỉ hiện khi có ĐỦ `assistant.use` và
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
      <Tooltip title="Trợ lý Copilot" placement="left">
        {/* Nút tròn nổi góc dưới phải, cùng kiểu trợ lý mua sắm của storefront: đỏ thương hiệu (#D42A27, chữ
            trắng 5:1) + viền trắng để không chìm trên nền tối. Vị trí cố định nên chỗ đặt trong header không ảnh hưởng. */}
        <Button
          shape="circle"
          type="primary"
          aria-label="Mở trợ lý Copilot"
          icon={<RobotOutlined className="text-lg" />}
          onClick={() => { setMounted(true); setOpen(true); }}
          className={`!fixed !bottom-6 !right-5 !z-[1000] !h-11 !w-11 !border-0 !bg-[#D42A27] !text-white !shadow-lg ring-2 ring-white hover:!bg-[#B2221F] ${className ?? ''}`}
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
