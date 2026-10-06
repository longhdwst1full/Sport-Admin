import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  createAdminSystemParameter,
  deleteAdminSystemParameter,
  getListAdminSystemParametersQueryKey,
  updateAdminSystemParameter,
} from '@/generated/api/system/system';
import type { SystemParameterDto } from '@/generated/api/system/system.schemas';
import { getMfaErrorMessage, isMfaCodeCancelled, useMfaCode, type MfaRequestOptions } from '@/features/auth';
import type { ParameterFormValues } from '../components/system-parameter-form-modal';
import { requiresMfaCode } from '../model/system-parameter-mfa.policy';

/**
 * Lưu (tạo/sửa) và ngừng dùng tham số. Tham số bảo mật đi qua `withMfaCode`; huỷ nhập mã không báo
 * lỗi. `mfaModal` phải được render bởi trang gọi.
 */
export function useSystemParameterCommands({
  editing,
  onSaved,
}: {
  editing?: SystemParameterDto;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { withMfaCode, mfaModal } = useMfaCode();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getListAdminSystemParametersQueryKey() });
  }

  const saveMutation = useMutation({
    mutationFn: (values: ParameterFormValues) => {
      if (editing) {
        const update = (options?: MfaRequestOptions) =>
          updateAdminSystemParameter(
            editing.code,
            {
              expectedVersion: editing.version,
              value: values.value!,
              ...(values.reason?.trim() ? { reason: values.reason.trim() } : {}),
            },
            options,
          );
        if (!requiresMfaCode(editing)) return update();
        return withMfaCode({
          title: `Xác thực để lưu ${editing.code}`,
          description: 'Tham số bảo mật: cần mã xác thực 2 lớp hiện tại của bạn để lưu thay đổi.',
          okText: 'Xác thực & lưu',
          run: update,
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
      onSaved();
      void message.success(editing ? 'Đã lưu giá trị mới' : 'Đã tạo tham số');
    },
    onError: (error: unknown) => {
      if (!isMfaCodeCancelled(error)) void message.error(getMfaErrorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ row, reason }: { row: SystemParameterDto; reason?: string }) => {
      const remove = (options?: MfaRequestOptions) =>
        deleteAdminSystemParameter(
          row.code,
          {
            expectedVersion: row.version,
            ...(reason?.trim() ? { reason: reason.trim() } : {}),
          },
          options,
        );
      if (!requiresMfaCode(row)) return remove();
      return withMfaCode({
        title: `Xác thực để ngừng dùng ${row.code}`,
        okText: 'Xác thực & ngừng dùng',
        danger: true,
        run: remove,
      });
    },
    onSuccess: async () => {
      await refresh();
      void message.success('Đã ngừng dùng tham số');
    },
    onError: (error: unknown) => {
      if (!isMfaCodeCancelled(error)) void message.error(getMfaErrorMessage(error));
    },
  });

  return { saveMutation, deactivateMutation, mfaModal };
}
