import React, { useState } from 'react';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export interface SensitiveTextToggleProps {
  /** The sensitive text to show/hide (e.g. phone number, email, citizen ID) */
  text: string;
  /** Initial visibility state (default: false) */
  defaultVisible?: boolean;
  /** Mask character to use (default: '•') */
  maskChar?: string;
  /** Masking pattern: 'full' masks all characters, 'partial' keeps first and last characters visible */
  mode?: 'full' | 'partial';
  className?: string;
}

/**
 * SensitiveTextToggle Component
 * Allows operators to toggle sensitive customer data (phone, email, tax code)
 * on and off for privacy and compliance (e.g. Decree 13 / GDPR).
 * Inspired by dragon-admin-web typography foundation.
 */
export function SensitiveTextToggle({
  text,
  defaultVisible = false,
  maskChar = '•',
  mode = 'partial',
  className = '',
}: SensitiveTextToggleProps) {
  const [visible, setVisible] = useState(defaultVisible);

  if (!text) return <span className="text-slate-400">—</span>;

  let maskedText = '';
  if (mode === 'partial') {
    if (text.includes('@')) {
      // Email masking: e.g. m***h@example.com
      const [name, domain] = text.split('@');
      const maskedName =
        name.length <= 2
          ? name[0] + maskChar.repeat(3)
          : name[0] + maskChar.repeat(name.length - 2) + name[name.length - 1];
      maskedText = `${maskedName}@${domain}`;
    } else if (text.length >= 7) {
      // Phone / ID masking: e.g. 090••••789
      const start = text.slice(0, 3);
      const end = text.slice(-3);
      maskedText = `${start}${maskChar.repeat(4)}${end}`;
    } else {
      maskedText = maskChar.repeat(text.length);
    }
  } else {
    maskedText = maskChar.repeat(text.length);
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <span className="select-all text-slate-800">{visible ? text : maskedText}</span>
      <Tooltip title={visible ? 'Ẩn thông tin nhạy cảm' : 'Hiện thông tin đầy đủ'}>
        <button
          type="button"
          aria-label={visible ? 'Ẩn thông tin nhạy cảm' : 'Hiện thông tin đầy đủ'}
          onClick={(e) => {
            e.stopPropagation();
            setVisible((prev) => !prev);
          }}
          className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer p-0.5"
        >
          {visible ? (
            <EyeInvisibleOutlined className="text-xs" />
          ) : (
            <EyeOutlined className="text-xs" />
          )}
        </button>
      </Tooltip>
    </span>
  );
}
