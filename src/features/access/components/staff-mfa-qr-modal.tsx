import { Alert, Button, Modal, Typography } from 'antd';
import type { MfaProvisioningDto } from '@/generated/api/iam/iam.schemas';
import { MfaQrPanel } from '@/features/auth';

export interface StaffMfaQrView {
  title: string;
  displayName: string;
  provisioning: MfaProvisioningDto;
  /** Thông tin thêm, ví dụ số phiên đã bị thu hồi khi cấp lại. */
  notice?: string;
}

/**
 * QR 2FA của nhân viên để Admin chuyển cho đúng người.
 * SECURITY: secret chỉ sống trong state của modal; đóng là bỏ, không cache vào react-query.
 */
export function StaffMfaQrModal({ view, onClose }: { view?: StaffMfaQrView; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(view)}
      title={view?.title}
      onCancel={onClose}
      maskClosable={false}
      destroyOnHidden
      footer={<Button type="primary" onClick={onClose}>Đã gửi cho nhân viên</Button>}
    >
      {view && (
        <>
          <Typography.Paragraph>
            Nhân viên: <Typography.Text strong>{view.displayName}</Typography.Text>
          </Typography.Paragraph>
          {view.notice && <Alert className="mb-4" type="info" showIcon message={view.notice} />}
          <MfaQrPanel
            otpauthUri={view.provisioning.otpauthUri}
            secret={view.provisioning.secret}
            note="Chỉ gửi mã QR/khoá này cho chính nhân viên qua kênh riêng. Nhân viên quét bằng Google Authenticator và nhập mã ở lần đăng nhập tiếp theo."
          />
        </>
      )}
    </Modal>
  );
}
