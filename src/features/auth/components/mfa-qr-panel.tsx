import { Alert, Typography } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import type { ReactNode } from 'react';

interface MfaQrPanelProps {
  otpauthUri: string;
  secret: string;
  note?: ReactNode;
}

/**
 * QR Google Authenticator + secret để nhập tay.
 * SECURITY: secret chỉ hiển thị trong phiên xem này, không lưu ở state toàn cục hay storage.
 */
export function MfaQrPanel({ otpauthUri, secret, note }: MfaQrPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <QRCodeSVG value={otpauthUri} size={196} marginSize={1} aria-label="Mã QR Google Authenticator" />
      </div>
      <div className="w-full text-center">
        <div className="text-xs text-slate-500">Không quét được? Nhập khoá thủ công:</div>
        <Typography.Text copyable={{ text: secret, tooltips: ['Sao chép', 'Đã sao chép'] }} code className="break-all">
          {secret}
        </Typography.Text>
      </div>
      {note && <Alert className="w-full" type="warning" showIcon message={note} />}
    </div>
  );
}
