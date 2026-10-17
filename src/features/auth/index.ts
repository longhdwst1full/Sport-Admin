import { lazy } from 'react';

// Trang là chunk lazy riêng: Access/System parameters/AdminLayout chỉ cần phần MFA tĩnh bên dưới.
export const LoginPage = lazy(() =>
  import('./pages/login-page').then((module) => ({ default: module.LoginPage })),
);
export const ChangePasswordPage = lazy(() =>
  import('./pages/change-password-page').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
export { useMfaCode, buildMfaRequestOptions, type MfaCodeRequest, type MfaRequestOptions } from './hooks/use-mfa-code';
export { MfaQrPanel } from './components/mfa-qr-panel';
export { getMfaErrorMessage, isMfaCodeCancelled } from './model/mfa-error';
export { MfaSelfEnrollmentEntry } from './components/mfa-self-enrollment-entry';
export { useMfaSelfEnrollment } from './hooks/use-mfa-self-enrollment';
