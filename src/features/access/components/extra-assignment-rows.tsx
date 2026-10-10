import { DeleteOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { Button, Form, Select } from 'antd';
import { Controller, type Control, type FieldErrors, type UseFieldArrayReturn } from 'react-hook-form';
import { BranchSelect } from '@/features/organization';
import { AssignableStaffRoleCode } from '@/generated/api/iam/iam.schemas';
import type { SelectOption } from '@/shared/utils/options';
import type { StaffCreationFormValues } from '../model/staff-creation.mapper';

interface ExtraAssignmentRowsProps {
  control: Control<StaffCreationFormValues>;
  errors: FieldErrors<StaffCreationFormValues>['extraAssignments'];
  rows: UseFieldArrayReturn<StaffCreationFormValues, 'extraAssignments'>;
  roleOptions: SelectOption[];
}

/** Các dòng vai trò + chi nhánh bổ sung khi tạo nhân viên; gán tuần tự sau khi tài khoản đã tạo. */
export function ExtraAssignmentRows({ control, errors, rows, roleOptions }: ExtraAssignmentRowsProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700">Phạm vi bổ sung</label>
        <Button
          type="link"
          size="small"
          icon={<PlusOutlined />}
          className="!text-xs"
          onClick={() => rows.append({ roleCode: AssignableStaffRoleCode.STAFF, branchId: '' })}
        >
          Thêm vai trò / chi nhánh
        </Button>
      </div>
      {rows.fields.length === 0 ? (
        <p className="text-[11px] text-slate-400 m-0">
          Tuỳ chọn: thêm vai trò tại chi nhánh khác. Có thể sửa hoặc thu hồi sau khi tạo.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.fields.map((row, index) => {
            const rowErrors = errors?.[index];
            return (
              <div key={row.id} className="flex items-start gap-2">
                <Form.Item
                  className="mb-0 w-44 shrink-0"
                  validateStatus={rowErrors?.roleCode ? 'error' : undefined}
                  help={rowErrors?.roleCode?.message}
                >
                  <Controller
                    name={`extraAssignments.${index}.roleCode`}
                    control={control}
                    render={({ field }) => <Select {...field} options={roleOptions} placeholder="Vai trò" />}
                  />
                </Form.Item>
                <Form.Item
                  className="mb-0 min-w-0 flex-1"
                  validateStatus={rowErrors?.branchId ? 'error' : undefined}
                  help={rowErrors?.branchId?.message}
                >
                  <Controller
                    name={`extraAssignments.${index}.branchId`}
                    control={control}
                    render={({ field }) => (
                      <BranchSelect
                        className="w-full"
                        placeholder="Chọn chi nhánh đang hoạt động"
                        labelFormat="code-name"
                        suffixIcon={<ShopOutlined className="text-slate-400" />}
                        value={field.value || undefined}
                        onChange={(next) => field.onChange(next ?? '')}
                        status={rowErrors?.branchId ? 'error' : undefined}
                      />
                    )}
                  />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Bỏ dòng phạm vi ${index + 1}`}
                  onClick={() => rows.remove(index)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
