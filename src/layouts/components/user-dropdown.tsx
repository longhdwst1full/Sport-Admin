import { useState } from 'react';
import { Avatar, Dropdown, type MenuProps } from 'antd';
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/core/auth/auth-context';

import { ProfileModal } from './profile-modal';
import { SettingsModal } from './settings-modal';
import { getInitials } from '@/shared/utils';

export function UserDropdown() {
  const auth = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = auth.currentUser;
  const displayName = user?.displayName ?? 'Admin';
  const initials = getInitials(displayName);

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin tài khoản',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') void auth.signOut();
    if (key === 'profile') setProfileOpen(true);
    if (key === 'settings') setSettingsOpen(true);
  };

  return (
    <>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Dropdown
      menu={{ items, onClick }}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName="min-w-[220px]"
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500/40"
      >
        <Avatar
          size={30}
          alt={displayName}
          className="!flex !items-center !justify-center !text-[10px] !font-bold shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            boxShadow: '0 1px 4px rgba(245, 158, 11, 0.25)',
          }}
        >
          {initials}
        </Avatar>
        <svg
          className="size-3.5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </Dropdown>
    </>
  );
}
