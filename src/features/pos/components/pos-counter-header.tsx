import { Form, Select, Tag } from 'antd';
import { ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useListAdminBranches } from '@/generated/api/organization/organization';
import { BranchDtoStatus } from '@/generated/api/organization/models';
import { useAuth } from '@/core/auth/auth-context';

/**
 * Dòng đầu của phiếu bán tại quầy: bán ở chi nhánh nào và ai đang đứng quầy.
 *
 * Nhân viên không chọn kho. Một chi nhánh trong V1 có đúng một kho, nên Backend tự suy ra từ chi
 * nhánh — bắt chọn cả hai chỉ tạo cơ hội chọn lệch nhau.
 */
export function PosCounterHeader({
  branchId,
  disabled,
  onChange,
}: {
  branchId?: string;
  disabled?: boolean;
  onChange: (branchId: string) => void;
}) {
  const auth = useAuth();
  const branches = useListAdminBranches();
  // Chi nhánh đã ngừng vẫn tồn tại để đọc lại lịch sử, nhưng không phải nơi thu tiền hôm nay.
  const activeBranches = (branches.data?.items ?? []).filter(
    (branch) => branch.status === BranchDtoStatus.ACTIVE,
  );

  return (
    <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
      <Form layout="vertical" className="!mb-0">
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-600">Chi nhánh bán</span>}
          required
          className="!mb-0"
        >
          <Select
            size="large"
            disabled={disabled}
            loading={branches.isLoading}
            value={branchId}
            placeholder="Chọn chi nhánh đang đứng quầy"
            prefix={<ShopOutlined className="text-slate-400" />}
            onChange={onChange}
            options={activeBranches.map((branch) => ({ value: branch.id, label: branch.name }))}
          />
        </Form.Item>
      </Form>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:justify-end">
        <UserOutlined className="text-slate-400" />
        <span>Nhân viên lập đơn:</span>
        <Tag color="blue" className="!m-0 !font-semibold">
          {auth.currentUser?.displayName ?? '—'}
        </Tag>
      </div>
    </div>
  );
}
