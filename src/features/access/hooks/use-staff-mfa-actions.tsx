import { useState } from 'react';
import { App } from 'antd';
import {
  revealAdminStaffMfa,
  reissueAdminStaffMfa,
  resetAdminStaffMfa,
} from '@/generated/api/iam/iam';
import type { UserDto } from '@/generated/api/iam/iam.schemas';
import { getMfaErrorMessage, isMfaCodeCancelled, useMfaCode } from '@/features/auth';
import { StaffMfaQrModal, type StaffMfaQrView } from '../components/staff-mfa-qr-modal';

/**
 * Xem QR / cấp lại QR / đặt lại 2FA của nhân viên. Mỗi thao tác cần mã TOTP hiện tại của người
 * thao tác (header x-mfa-code) và đều được API ghi audit.
 */
export function useStaffMfaActions() {
  const { message, modal } = App.useApp();
  const { withMfaCode, mfaModal } = useMfaCode();
  const [qrView, setQrView] = useState<StaffMfaQrView>();

  const reportError = (error: unknown, fallback: string) => {
    if (!isMfaCodeCancelled(error)) void message.error(getMfaErrorMessage(error, fallback));
  };

  const viewQr = (user: UserDto) => {
    void withMfaCode({
      title: 'Xem QR xác thực 2 lớp',
      description: `Xem lại QR hiện hành của ${user.displayName}. Mỗi lần xem đều được ghi nhật ký.`,
      okText: 'Xác thực & xem',
      run: (options) => revealAdminStaffMfa(user.id, options),
    })
      .then((result) =>
        setQrView({ title: 'QR xác thực 2 lớp', displayName: user.displayName, provisioning: result }),
      )
      .catch((error: unknown) => reportError(error, 'Không xem được QR xác thực.'));
  };

  const reissueQr = (user: UserDto) => {
    modal.confirm({
      title: `Cấp lại QR cho ${user.displayName}?`,
      content:
        'Khoá cũ hết hiệu lực ngay, mọi phiên đăng nhập của nhân viên bị thu hồi. Nhân viên phải quét QR mới trước lần đăng nhập tiếp theo.',
      okText: 'Tiếp tục',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      // Đóng hộp xác nhận trước rồi mới hỏi mã, tránh hai modal chồng nhau.
      onOk: () => {
        void withMfaCode({
          title: 'Xác thực để cấp lại QR',
          okText: 'Xác thực & cấp lại',
          danger: true,
          run: (options) => reissueAdminStaffMfa(user.id, options),
        })
          .then((result) =>
            setQrView({
              title: 'QR xác thực 2 lớp mới',
              displayName: user.displayName,
              provisioning: result,
              notice: `Đã thu hồi ${result.revokedSessionCount} phiên đăng nhập của nhân viên.`,
            }),
          )
          .catch((error: unknown) => reportError(error, 'Không cấp lại được QR.'));
      },
    });
  };

  const resetMfa = (user: UserDto) => {
    modal.confirm({
      title: `Đặt lại 2FA của ${user.displayName}?`,
      content:
        'Xoá khoá xác thực 2 lớp hiện tại và thu hồi mọi phiên đăng nhập. Ở lần đăng nhập tiếp theo nhân viên sẽ tự thiết lập lại Google Authenticator.',
      okText: 'Tiếp tục',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        void withMfaCode({
          title: 'Xác thực để đặt lại 2FA',
          okText: 'Xác thực & đặt lại',
          danger: true,
          run: (options) => resetAdminStaffMfa(user.id, options),
        })
          .then((result) =>
            void message.success(
              `Đã đặt lại 2FA và thu hồi ${result.revokedSessionCount} phiên đăng nhập.`,
            ),
          )
          .catch((error: unknown) => reportError(error, 'Không đặt lại được 2FA.'));
      },
    });
  };

  const modals = (
    <>
      {mfaModal}
      <StaffMfaQrModal view={qrView} onClose={() => setQrView(undefined)} />
    </>
  );

  return { viewQr, reissueQr, resetMfa, showProvisionedQr: setQrView, modals };
}
