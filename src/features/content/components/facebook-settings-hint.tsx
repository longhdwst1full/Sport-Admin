import { Alert } from 'antd';
import { Link } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { FACEBOOK_PARAMETER_CODES, FACEBOOK_SETTINGS_PATH } from '../constants/social.constants';

/**
 * Hiện khi API trả 503 SOCIAL_FACEBOOK_NOT_CONFIGURED: cấu hình Page nằm trong Tham số hệ thống (nhóm
 * INTEGRATION), không có màn riêng. Link chỉ hiện với người xem được tham số hệ thống.
 */
export function FacebookSettingsHint() {
  const canViewParameters = useCan('system.parameter.view');
  return (
    <Alert
      className="mb-3"
      type="warning"
      showIcon
      message="Chưa cấu hình Facebook Page"
      description={
        <span>
          Cần nhập {FACEBOOK_PARAMETER_CODES.join(' và ')} trong{' '}
          {canViewParameters ? <Link to={FACEBOOK_SETTINGS_PATH}>Tham số hệ thống</Link> : 'Tham số hệ thống'}
          {canViewParameters ? '' : ' (liên hệ quản trị viên)'}.
        </span>
      }
    />
  );
}
