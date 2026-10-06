import { useState } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { ControlOutlined, GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Select } from 'antd';
import { useListAdminSystemParameters } from '@/generated/api/system/system';
import type {
  SystemParameterStatus,
  SystemParameterDto,
} from '@/generated/api/system/system.schemas';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { SearchInput } from '@/foundation/inputs/search-input';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { getApiErrorMessage } from '@/lib/api/error';
import { SystemParameterFormModal } from '../components/system-parameter-form-modal';
import { SystemParameterTable } from '../components/system-parameter-table';
import {
  PARAMETER_GROUP_OPTIONS,
  PARAMETER_STATUS_OPTIONS,
  SYSTEM_PARAMETER_PAGE_SIZE,
} from '../constants/system-parameter.constants';
import { useSystemParameterCommands } from '../hooks/use-system-parameter-commands';
import { requiresMfaCode } from '../model/system-parameter-mfa.policy';

export function SystemParametersPage() {
  const { message, modal } = App.useApp();
  const canManage = useCan('system.parameter.manage');
  const search = useSearchState();
  const [groupCode, setGroupCode] = useState<string>();
  const [status, setStatus] = useState<SystemParameterStatus>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemParameterDto>();
  const [page, setPage] = useListPageReset([search.debounced, groupCode, status]);

  const parameters = useListAdminSystemParameters({
    page,
    limit: SYSTEM_PARAMETER_PAGE_SIZE,
    search: search.debounced,
    groupCode: groupCode as never,
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
    let reason = '';
    modal.confirm({
      title: `Ngừng dùng ${row.code}?`,
      content: (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            Bản ghi chuyển sang trạng thái ngừng dùng, không bị xóa khỏi database.
          </p>
          <Input.TextArea
            rows={2}
            placeholder="Nhập lý do ngừng dùng..."
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: 'Ngừng dùng',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        if (reason.trim().length > 0) {
          void message.error('Nếu nhập lý do');
          return Promise.reject(new Error('reason-too-short'));
        }
        if (requiresMfaCode(row)) {
          // Đóng hộp xác nhận rồi mới hỏi mã 2FA: hai modal chồng nhau dễ che mất ô nhập mã.
          deactivateMutation.mutate({ row, reason: reason.trim() });
          return undefined;
        }
        return deactivateMutation.mutateAsync({ row, reason: reason.trim() });
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
              value={search.value}
              onChange={search.setValue}
              placeholder="Mã hoặc tên tham số"
            />
            <Select
              allowClear
              className="min-w-40"
              value={groupCode}
              onChange={setGroupCode}
              placeholder="Nhóm"
              options={PARAMETER_GROUP_OPTIONS}
            />
            <Select
              allowClear
              className="min-w-36"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={PARAMETER_STATUS_OPTIONS}
            />
          </FilterBar>
        }
      >
        {parameters.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách tham số"
            description={getApiErrorMessage(parameters.error)}
          />
        )}
        <SystemParameterTable
          rows={rows}
          loading={parameters.isLoading || parameters.isFetching}
          page={page}
          total={parameters.data?.total ?? 0}
          canManage={canManage}
          onPageChange={setPage}
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
