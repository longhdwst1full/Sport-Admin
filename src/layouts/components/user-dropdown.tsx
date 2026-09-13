import { useState } from 'react';
import { Avatar, Divider, Dropdown, type MenuProps } from 'antd';
import {
  LogoutOutlined,
  MoonOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/core/auth/auth-context';

import { ProfileModal } from './profile-modal';
import { SettingsModal } from './settings-modal';

function getInitials(name: string): string {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserDropdown() {
  const auth = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = auth.currentUser;
  const displayName = user?.displayName ?? 'Admin';
  const initials = getInitials(displayName);
  const userRecord = user as (Record<string, unknown> | undefined);
  const avatarUrl = (user?.avatarUrl ?? user?.avatar ?? userRecord?.imageUrl ?? userRecord?.photoUrl) as string | undefined;
  const scopeLabels = Array.isArray(user?.scopes)
    ? user.scopes.map((scope) => scope.type).join(', ')
    : '';

  const items: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 px-1 py-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Avatar
            src={avatarUrl}
            size={40}
            alt={displayName}
            className="!flex shrink-0 !items-center !justify-center !text-sm !font-bold border border-emerald-500/20"
            style={{
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 2px 8px rgb(5 150 105 / 0.15)',
            }}
          >
            {initials}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">
              {auth.developmentBypass ? 'DEV bypass' : scopeLabels || 'Chưa có phạm vi'}
            </div>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
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
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500/40"
      >
        <Avatar
          src={avatarUrl}
          size={36}
          alt={displayName}
          className="!flex !items-center !justify-center !text-xs !font-bold shrink-0 border border-emerald-500/20"
          style={{
            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: '0 2px 8px rgb(5 150 105 / 0.25)',
          }}
        >
          {initials}
        </Avatar>
        <div className="hidden text-left xl:block">
          <div className="text-sm font-medium leading-tight text-slate-800">
            {displayName}
          </div>
          <div className="text-[11px] leading-tight text-slate-400">
            {auth.developmentBypass ? 'DEV mode' : scopeLabels || 'Admin'}
          </div>
        </div>
        <svg
          className="hidden size-4 text-slate-400 xl:block"
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
