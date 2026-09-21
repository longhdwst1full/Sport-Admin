import { useEffect, useMemo } from 'react';
import { Form, Select, Tag, Tooltip } from 'antd';
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useListAdminBranches } from '@/generated/api/organization/organization';
import { AuthScopeDtoType } from '@/generated/api/auth/models';
import { BranchDtoStatus } from '@/generated/api/organization/models';
import { useAuth } from '@/core/auth/auth-context';

/**
 * Dòng đầu của phiếu bán tại quầy: bán ở chi nhánh nào và ai đang đứng quầy.
 *
 * Nhân viên không chọn kho. Một chi nhánh trong V1 có đúng một kho, nên Backend tự suy ra từ chi
 * nhánh — bắt chọn cả hai chỉ tạo cơ hội chọn lệch nhau.
 *
 * Tài khoản gắn đúng một chi nhánh thì chi nhánh đó được điền sẵn và khoá lại: họ không bán được ở
 * nơi khác (Backend từ chối), nên để ô trống chỉ bắt họ chọn lại đúng thứ duy nhất có thể chọn.
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
  const activeBranches = useMemo(
    () =>
      (branches.data?.items ?? []).filter((branch) => branch.status === BranchDtoStatus.ACTIVE),
    [branches.data?.items],
  );

  const scopes = auth.currentUser?.scopes ?? [];
  const hasGlobalScope = scopes.some((scope) => scope.type === AuthScopeDtoType.GLOBAL);
  const scopedBranchIds = scopes.flatMap((scope) =>
    scope.type === AuthScopeDtoType.BRANCH && scope.branchId ? [scope.branchId] : [],
  );
  // Phạm vi toàn hệ thống thì thấy mọi chi nhánh; còn lại chỉ thấy chi nhánh mình phụ trách.
  const selectableBranches = hasGlobalScope
    ? activeBranches
    : activeBranches.filter((branch) => scopedBranchIds.includes(branch.id));
  const lockedToSingleBranch = !hasGlobalScope && selectableBranches.length === 1;

  useEffect(() => {
    if (branchId || selectableBranches.length !== 1 || hasGlobalScope) return;
    onChange(selectableBranches[0].id);
  }, [branchId, hasGlobalScope, onChange, selectableBranches]);

  return (
    <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
      <Form layout="vertical" className="!mb-0">
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-600">Chi nhánh bán</span>}
          required
          className="!mb-0"
          extra={
            lockedToSingleBranch ? (
              <span className="text-xs text-slate-500">Lấy theo chi nhánh của tài khoản.</span>
            ) : undefined
          }
        >
          <Select
            size="large"
            disabled={disabled || lockedToSingleBranch}
            loading={branches.isLoading}
            value={branchId}
            placeholder="Chọn chi nhánh đang đứng quầy"
            showSearch
            optionFilterProp="label"
            prefix={
              lockedToSingleBranch ? (
                <Tooltip title="Tài khoản chỉ bán được tại chi nhánh này">
                  <LockOutlined className="text-slate-400" />
                </Tooltip>
              ) : (
                <ShopOutlined className="text-slate-400" />
              )
            }
            onChange={onChange}
            options={selectableBranches.map((branch) => ({ value: branch.id, label: branch.name }))}
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
