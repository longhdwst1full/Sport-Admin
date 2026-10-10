import { useState } from 'react';
import { ControlOutlined, GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Select } from 'antd';
import { useListAdminSystemParameters } from '@/generated/api/system/system';
import {
  SystemParameterGroup,
  SystemParameterStatus,
  type SystemParameterDto,
} from '@/generated/api/system/system.schemas';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { SearchInput } from '@/foundation/inputs/search-input';
import { useConfirmWithReason } from '@/foundation/overlay';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { SystemParameterFormModal } from '../components/system-parameter-form-modal';
import { SystemParameterTable } from '../components/system-parameter-table';
import {
  PARAMETER_GROUP_OPTIONS,
  PARAMETER_REASON_MAX_LENGTH,
  PARAMETER_REASON_MIN_LENGTH,
  PARAMETER_STATUS_OPTIONS,
} from '../constants/system-parameter.constants';
import { useSystemParameterCommands } from '../hooks/use-system-parameter-commands';
import { requiresMfaCode } from '../model/system-parameter-mfa.policy';

export function SystemParametersPage() {
  const { message } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const canManage = useCan('system.parameter.manage');
  // Ô tìm (`q`), nhóm (`group`), trạng thái (`status`) và trang nằm trên URL; đổi lọc thì về trang 1.
  const search = useUrlSearch(['q']);
  const { url } = search;
  const groupCode = url.getEnum('group', SystemParameterGroup);
  const status = url.getEnum('status', SystemParameterStatus);
  const page = url.getNumber('page', 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemParameterDto>();

  const parameters = useListAdminSystemParameters({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    search: url.get('q'),
    groupCode,
    status,
  });
  const rows = parameters.data?.items ?? [];

  const { saveMutation, deactivateMutation, mfaModal } = useSystemParameterCommands({
    editing,
    onSaved: () => {
      setFormOpen(false);
      setEditing(undefined);
    },
  });

  function confirmDeactivate(row: SystemParameterDto) {
    confirmWithReason({
      title: `Ngừng dùng ${row.code}?`,
      consequence: 'Bản ghi chuyển sang trạng thái ngừng dùng, không bị xoá khỏi database.',
      okText: 'Ngừng dùng',
      placeholder: 'Lý do ngừng dùng (tuỳ chọn)',
      minLength: 0,
      maxLength: PARAMETER_REASON_MAX_LENGTH,
      onOk: (reason) => {
        // CONTRACT: lý do tuỳ chọn nhưng nếu nhập thì API yêu cầu tối thiểu 5 ký tự.
        if (reason && reason.length < PARAMETER_REASON_MIN_LENGTH) {
          void message.error(`Lý do (nếu nhập) tối thiểu ${PARAMETER_REASON_MIN_LENGTH} ký tự`);
          return Promise.reject(new Error('reason-too-short'));
        }
        if (requiresMfaCode(row)) {
          // Đóng hộp xác nhận rồi mới hỏi mã 2FA: hai modal chồng nhau dễ che mất ô nhập mã.
          deactivateMutation.mutate({ row, reason });
          return undefined;
        }
        return deactivateMutation.mutateAsync({ row, reason });
      },
    });
  }

  return (
    <>
      <ManagementPage
        eyebrow="System configuration"
        title="Tham số hệ thống"
        description="Ngưỡng nghiệp vụ sửa được tại đây và có hiệu lực ngay, không cần deploy lại."
        metrics={[
          {
            key: 'total',
            label: 'Tham số phù hợp',
            value: parameters.data?.total ?? 0,
            icon: <ControlOutlined />,
            tone: 'blue',
          },
          {
            key: 'public',
            label: 'Storefront đọc được',
            value: rows.filter((row) => row.isPublic).length,
            icon: <GlobalOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <FilterBar
            actions={
              <>
                <RefreshButton onRefresh={parameters.refetch} loading={parameters.isFetching} />
                {canManage && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Tạo tham số
                  </Button>
                )}
              </>
            }
          >
            <SearchInput
              value={search.values.q}
              onChange={search.setter('q')}
              placeholder="Mã hoặc tên tham số"
            />
            <Select
              allowClear
              className="min-w-40"
              value={groupCode}
              onChange={(value?: string) => url.patch({ group: value, page: undefined })}
              placeholder="Nhóm"
              options={PARAMETER_GROUP_OPTIONS}
            />
            <Select
              allowClear
              className="min-w-36"
              value={status}
              onChange={(value?: string) => url.patch({ status: value, page: undefined })}
              placeholder="Trạng thái"
              options={PARAMETER_STATUS_OPTIONS}
            />
          </FilterBar>
        }
      >
        {parameters.isError && <QueryErrorAlert error={parameters.error} retry={() => void parameters.refetch()} />}
        <SystemParameterTable
          rows={rows}
          loading={parameters.isLoading || parameters.isFetching}
          page={page}
          total={parameters.data?.total ?? 0}
          canManage={canManage}
          onPageChange={(next) => url.set('page', next > 1 ? next : undefined)}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onDeactivate={confirmDeactivate}
        />
      </ManagementPage>

      <SystemParameterFormModal
        open={formOpen}
        editing={editing}
        submitting={saveMutation.isPending}
        onCancel={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
      />
      {mfaModal}
    </>
  );
}
