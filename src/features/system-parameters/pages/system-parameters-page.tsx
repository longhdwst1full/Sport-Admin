import { useEffect, useState } from 'react';
import { ControlOutlined, GlobalOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Select } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import {
  createAdminSystemParameter,
  deleteAdminSystemParameter,
  getListAdminSystemParametersQueryKey,
  updateAdminSystemParameter,
  useListAdminSystemParameters,
} from '@/generated/api/system/system';
import type {
  ListAdminSystemParametersStatus,
  SystemParameterDto,
} from '@/generated/api/system/models';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  SystemParameterFormModal,
  type ParameterFormValues,
} from '../components/system-parameter-form-modal';
import { SystemParameterTable } from '../components/system-parameter-table';
import {
  SYSTEM_PARAMETER_PAGE_SIZE,
  parameterGroupLabels,
} from '../constants/system-parameter.constants';

export function SystemParametersPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('system.parameter.manage');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupCode, setGroupCode] = useState<string>();
  const [status, setStatus] = useState<ListAdminSystemParametersStatus>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemParameterDto>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);

  useEffect(() => setPage(1), [debouncedSearch, groupCode, status]);

  const parameters = useListAdminSystemParameters({
    page,
    limit: SYSTEM_PARAMETER_PAGE_SIZE,
    search: debouncedSearch || undefined,
    groupCode: groupCode as never,
    status,
  });
  const rows = parameters.data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getListAdminSystemParametersQueryKey() });
  }

  const saveMutation = useMutation({
    mutationFn: (values: ParameterFormValues) => {
      if (editing) {
        return updateAdminSystemParameter(editing.code, {
          expectedVersion: editing.version,
          value: values.value!,
          reason: values.reason!,
        });
      }
      return createAdminSystemParameter({
        code: values.code!,
        groupCode: values.groupCode! as never,
        label: values.label!,
        description: values.description,
        valueType: values.valueType! as never,
        value: values.value!,
        minValue: values.minValue,
        maxValue: values.maxValue,
        unit: values.unit,
        isPublic: values.isPublic ?? false,
      });
    },
    onSuccess: async () => {
      await refresh();
      setFormOpen(false);
      setEditing(undefined);
      void message.success(editing ? 'Đã lưu giá trị mới' : 'Đã tạo tham số');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ row, reason }: { row: SystemParameterDto; reason: string }) =>
      deleteAdminSystemParameter(row.code, { expectedVersion: row.version, reason }),
    onSuccess: async () => {
      await refresh();
      void message.success('Đã ngừng dùng tham số');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
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
            placeholder="Lý do (tối thiểu 5 ký tự)"
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
        if (reason.trim().length < 5) {
          void message.error('Vui lòng nhập lý do tối thiểu 5 ký tự');
          return Promise.reject(new Error('reason-required'));
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
        dataNotice="Bí mật và cấu hình hạ tầng (chuỗi kết nối, khoá API, JWT) vẫn nằm ở biến môi trường và không xuất hiện ở màn hình này."
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
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc tên tham số"
            />
            <Select
              allowClear
              className="min-w-40"
              value={groupCode}
              onChange={setGroupCode}
              placeholder="Nhóm"
              options={Object.entries(parameterGroupLabels).map(([value, label]) => ({ value, label }))}
            />
            <Select
              allowClear
              className="min-w-36"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={[
                { value: 'ACTIVE', label: 'Đang dùng' },
                { value: 'INACTIVE', label: 'Ngừng dùng' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void parameters.refetch()}>
              Làm mới
            </Button>
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
          </div>
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
    </>
  );
}
