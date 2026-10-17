import { useMemo, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Form, Input, Radio, Select, Space, Steps, Typography } from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { RoleDeleteOrphanAction, type DeleteRoleDto, type RoleDto } from '@/generated/api/iam/iam.schemas';
import { FormModal, useConfirmDiscard } from '@/foundation/overlay';
import {
  DEFAULT_ROLE_DELETE_ORPHAN_ACTION,
  ROLE_DELETE_ORPHAN_ACTION_LABELS,
  ROLE_DELETE_REASON_MIN_LENGTH,
} from '../constants/role.constants';
import {
  describeRoleDeleteImpact,
  toDeleteRolePayload,
  toRoleFallbackOptions,
  type RoleDeleteChoice,
  type RoleDeleteFormValues,
} from '../model/role-lifecycle.policy';

const DEFAULT_VALUES: RoleDeleteFormValues = {
  fallbackRoleId: null,
  orphanAction: DEFAULT_ROLE_DELETE_ORPHAN_ACTION,
  reason: '',
};

const schema: yup.ObjectSchema<RoleDeleteFormValues> = yup.object({
  fallbackRoleId: yup.string().nullable().defined(),
  orphanAction: yup
    .mixed<RoleDeleteOrphanAction>()
    .oneOf(Object.values(RoleDeleteOrphanAction))
    .required('Chọn cách xử lý tài khoản'),
  reason: yup
    .string()
    .trim()
    .min(ROLE_DELETE_REASON_MIN_LENGTH, `Lý do tối thiểu ${ROLE_DELETE_REASON_MIN_LENGTH} ký tự`)
    .max(255)
    .required('Nhập lý do xoá'),
});

/** Bước 1: chuyển sang vai trò khác. Bước 2: xử lý tài khoản (chỉ khi không chọn vai trò). */
const STEP = { MOVE: 0, ORPHAN: 1 } as const;
type Step = (typeof STEP)[keyof typeof STEP];

const ORPHAN_HELP =
  'Chỉ áp dụng cho tài khoản không còn vai trò nào khác; tài khoản còn vai trò khác chỉ bị gỡ vai trò này.';

/**
 * Xác nhận xoá vai trò (D98), hai bước:
 * 1. "Chuyển vai trò" — chọn vai trò ACTIVE khác nhận người đang giữ ("Chuyển & xoá"), hoặc "Không chuyển, tiếp tục".
 * 2. "Xử lý tài khoản" — vai trò vẫn bị xoá; chọn Ngừng hoạt động / Xoá cho tài khoản không còn vai trò nào khác.
 * Vai trò chưa ai giữ: bỏ qua cả hai bước, chỉ còn lý do + Xoá. Lý do bắt buộc ở bước gửi.
 * UX: modal chỉ đóng khi xoá thành công; lỗi đã được báo bằng toast ở trang, giữ nội dung để thử lại.
 */
export function RoleDeleteModal({
  target,
  roles,
  submitting,
  onClose,
  onSubmit,
}: {
  target?: RoleDto;
  /** Danh sách vai trò hiện có (trang đã tải) để chọn vai trò chuyển sang. */
  roles: readonly RoleDto[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (role: RoleDto, payload: Omit<DeleteRoleDto, 'expectedVersion'>) => Promise<unknown>;
}) {
  const [step, setStep] = useState<Step>(STEP.MOVE);
  const { control, handleSubmit, reset, getValues, setValue, formState: { errors } } = useForm<RoleDeleteFormValues>({
    resolver: yupResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  const [fallbackRoleId, orphanAction] = useWatch({ control, name: ['fallbackRoleId', 'orphanAction'] });
  const fallbackOptions = useMemo(
    () => (target ? toRoleFallbackOptions(roles, target.id) : []),
    [roles, target],
  );
  const hasHolders = (target?.activeAssignmentCount ?? 0) > 0;
  const deleteAccount = orphanAction === RoleDeleteOrphanAction.DELETE_ACCOUNT;

  // Đặt lại form + bước ngay trên đường đóng thay vì effect theo `target` (RULE-HOOK-01).
  const close = () => {
    reset(DEFAULT_VALUES);
    setStep(STEP.MOVE);
    onClose();
  };
  const requestClose = useConfirmDiscard(() => getValues('reason').trim().length > 0, close);

  const submit = handleSubmit(async (values) => {
    if (!target) return;
    try {
      await onSubmit(target, toDeleteRolePayload(target, values));
      close();
    } catch {
      // Lỗi đã được báo qua callback của mutation; giữ modal để người dùng thử lại.
    }
  });

  const choice: RoleDeleteChoice = step === STEP.MOVE && fallbackRoleId
    ? { kind: 'move', roleLabel: fallbackOptions.find(({ value }) => value === fallbackRoleId)?.label ?? '' }
    : { kind: 'orphan', orphanAction };

  const reasonField = (
    <Form.Item label="Lý do" required validateStatus={errors.reason ? 'error' : undefined} help={errors.reason?.message}>
      <Controller
        name="reason"
        control={control}
        render={({ field }) => (
          <Input.TextArea
            {...field}
            rows={2}
            maxLength={255}
            showCount
            placeholder={`Lý do (tối thiểu ${ROLE_DELETE_REASON_MIN_LENGTH} ký tự)`}
          />
        )}
      />
    </Form.Item>
  );

  const footer = !hasHolders ? (
    <Space>
      <Button disabled={submitting} onClick={requestClose}>Huỷ</Button>
      <Button danger type="primary" loading={submitting} onClick={() => void submit()}>Xoá</Button>
    </Space>
  ) : step === STEP.MOVE ? (
    <Space wrap>
      <Button disabled={submitting} onClick={requestClose}>Huỷ</Button>
      <Button
        disabled={submitting}
        onClick={() => {
          setValue('fallbackRoleId', null);
          setStep(STEP.ORPHAN);
        }}
      >
        Không chuyển, tiếp tục
      </Button>
      <Button type="primary" danger disabled={!fallbackRoleId} loading={submitting} onClick={() => void submit()}>
        Chuyển & xoá
      </Button>
    </Space>
  ) : (
    <Space>
      <Button disabled={submitting} onClick={() => setStep(STEP.MOVE)}>Quay lại</Button>
      <Button type="primary" danger loading={submitting} onClick={() => void submit()}>Xoá vai trò</Button>
    </Space>
  );

  return (
    <FormModal
      size="sm"
      open={Boolean(target)}
      title={`Xoá vai trò ${target?.code ?? ''}?`}
      submitting={submitting}
      onClose={close}
      onSubmit={() => void submit()}
      isDirty={() => getValues('reason').trim().length > 0}
      footer={footer}
    >
      <Form layout="vertical">
        {hasHolders && (
          <Steps
            size="small"
            current={step}
            className="mb-4"
            items={[{ title: 'Chuyển vai trò' }, { title: 'Xử lý tài khoản' }]}
          />
        )}
        {hasHolders && step === STEP.MOVE && (
          <Form.Item
            label="Chuyển người đang giữ vai trò sang"
            extra={`${target?.activeAssignmentCount ?? 0} phân quyền đang hoạt động sẽ được chuyển, giữ nguyên chi nhánh/phạm vi.`}
          >
            <Controller
              name="fallbackRoleId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onChange={(value?: string) => field.onChange(value ?? null)}
                  options={fallbackOptions}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn vai trò đang hoạt động"
                />
              )}
            />
          </Form.Item>
        )}
        {hasHolders && step === STEP.ORPHAN && (
          <Form.Item
            label="Vai trò sẽ bị xoá. Tài khoản không còn vai trò nào khác sẽ:"
            required
            extra={ORPHAN_HELP}
            validateStatus={errors.orphanAction ? 'error' : undefined}
            help={errors.orphanAction?.message}
          >
            <Controller
              name="orphanAction"
              control={control}
              render={({ field }) => (
                <Radio.Group value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                  <Space direction="vertical">
                    <Radio value={RoleDeleteOrphanAction.DEACTIVATE}>
                      {ROLE_DELETE_ORPHAN_ACTION_LABELS.DEACTIVATE}
                    </Radio>
                    <Radio value={RoleDeleteOrphanAction.DELETE_ACCOUNT}>
                      <Typography.Text type="danger" strong>
                        {ROLE_DELETE_ORPHAN_ACTION_LABELS.DELETE_ACCOUNT}
                      </Typography.Text>
                    </Radio>
                  </Space>
                </Radio.Group>
              )}
            />
          </Form.Item>
        )}
        {target && (
          <Alert
            className="mb-4"
            showIcon
            type={hasHolders && step === STEP.ORPHAN && deleteAccount ? 'error' : 'warning'}
            message={describeRoleDeleteImpact(target, choice)}
          />
        )}
        {reasonField}
      </Form>
    </FormModal>
  );
}
