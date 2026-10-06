import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useState } from 'react';
import {
  activateAdminCustomer,
  deactivateAdminCustomer,
  deleteAdminCustomer,
  getGetAdminCustomerQueryKey,
  getListAdminCustomersQueryKey,
} from '@/generated/api/customers/customers';
import { getApiErrorMessage } from '@/lib/api/error';
import type { CustomerRowView } from '../model/customer.mapper';

/**
 * Lệnh ngừng/mở lại và xoá khách từ bảng. `busyId` là dòng đang chờ kết quả để khoá nút, tránh bấm
 * chồng lệnh với cùng `expectedVersion`.
 */
export function useCustomerLifecycle() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string>();

  const statusMutation = useMutation({
    mutationFn: (row: CustomerRowView) => {
      const command = { expectedVersion: row.version };
      return row.status === 'ACTIVE'
        ? deactivateAdminCustomer(row.id, command)
        : activateAdminCustomer(row.id, command);
    },
    onSuccess: async (_result, row) => {
      // CACHE: lifecycle đổi cả list theo status lẫn drawer chi tiết của đúng khách.
      await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetAdminCustomerQueryKey(row.id) });
      void message.success(
        row.status === 'ACTIVE' ? 'Đã ngừng hoạt động khách hàng.' : 'Đã mở lại khách hàng.',
      );
    },
    onError: (error) =>
      void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái khách hàng.')),
    onSettled: () => setBusyId(undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: CustomerRowView) =>
      deleteAdminCustomer(row.id, { expectedVersion: row.version }),
    onSuccess: async (_result, row) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
      queryClient.removeQueries({ queryKey: getGetAdminCustomerQueryKey(row.id) });
      void message.success('Đã xoá hồ sơ khách hàng.');
    },
    onError: (error) =>
      void message.error(
        getApiErrorMessage(error, 'Không xoá được khách hàng. Khách đã có đơn thì chỉ ngừng được.'),
      ),
    onSettled: () => setBusyId(undefined),
  });

  return {
    busyId: statusMutation.isPending || deleteMutation.isPending ? busyId : undefined,
    toggleStatus: (row: CustomerRowView) => {
      setBusyId(row.id);
      statusMutation.mutate(row);
    },
    remove: (row: CustomerRowView) => {
      setBusyId(row.id);
      deleteMutation.mutate(row);
    },
  };
}
