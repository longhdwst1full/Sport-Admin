import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { MfaEnrollmentState } from '@/generated/api/auth/auth.schemas';
import { useGetAdminMfaStatus } from '@/generated/api/auth/auth';
import { useMfaSelfEnrollment } from '../hooks/use-mfa-self-enrollment';

/**
 * Lối vào tự bật 2FA trên thanh tiêu đề. Chỉ hiện khi API báo tài khoản chưa ACTIVE và không được
 * miễn (break-glass); tài khoản đã bật thì không render gì, giao diện giữ nguyên.
 */
export function MfaSelfEnrollmentEntry() {
  const status = useGetAdminMfaStatus({ query: { staleTime: 60_000, retry: false } });
  const { startSelfEnrollment, starting, selfEnrollmentModal } = useMfaSelfEnrollment();
  const data = status.data;
  if (!data || data.exempt || data.status === MfaEnrollmentState.ACTIVE) return null;

  return (
    <>
      <Tooltip title={data.enforced ? 'Bắt buộc bật xác thực 2 lớp' : 'Bật xác thực 2 lớp'}>
        <Button
          type="text"
          size="small"
          icon={<SafetyCertificateOutlined />}
          loading={starting}
          onClick={() => void startSelfEnrollment()}
          className="!text-amber-600 hover:!bg-slate-200/70"
        >
          <span className="hidden lg:inline">Bật xác thực 2 lớp</span>
        </Button>
      </Tooltip>
      {selfEnrollmentModal}
    </>
  );
}
