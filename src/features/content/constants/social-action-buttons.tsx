import type { ReactNode } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FacebookOutlined,
  RedoOutlined,
  SendOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { SocialAction } from '../model/social-actions.policy';

/** Nhãn + icon của từng lệnh Facebook, dùng chung cho hàng trong bảng và drawer chi tiết. */
export const SOCIAL_ACTION_BUTTON: Record<SocialAction, { label: string; icon: ReactNode; danger?: boolean; primary?: boolean }> = {
  createDraft: { label: 'Đăng Facebook', icon: <FacebookOutlined />, primary: true },
  editDraft: { label: 'Sửa nháp', icon: <EditOutlined /> },
  submit: { label: 'Gửi duyệt', icon: <SendOutlined />, primary: true },
  approve: { label: 'Duyệt / Hẹn giờ', icon: <CheckOutlined />, primary: true },
  retry: { label: 'Đăng lại', icon: <RedoOutlined />, primary: true },
  reconcile: { label: 'Đối soát', icon: <SyncOutlined />, primary: true },
  editCaption: { label: 'Sửa nội dung trên FB', icon: <CloudUploadOutlined /> },
  reject: { label: 'Từ chối', icon: <CloseOutlined />, danger: true },
  cancel: { label: 'Huỷ bản đăng', icon: <StopOutlined />, danger: true },
  delete: { label: 'Xoá trên Facebook', icon: <DeleteOutlined />, danger: true },
};

