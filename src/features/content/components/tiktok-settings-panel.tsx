import { TikTokOutlined } from '@ant-design/icons';
import { Alert, Avatar, Select, Skeleton, Switch, Tooltip } from 'antd';
import { useEffect, useId } from 'react';
import type { TikTokCreatorInfoDto } from '@/generated/api/content/content.schemas';
import { tiktokPrivacyLabels } from '../constants/social.constants';
import { socialCommandErrorMessage } from '../model/social-command-error';
import {
  applyCreatorConstraints,
  TIKTOK_PRIVACY_REQUIRED,
  TIKTOK_RULE_HINT,
  type TikTokPostSettingsForm,
} from '../model/tiktok-post-settings';

type TikTokToggle = Exclude<keyof TikTokPostSettingsForm, 'privacyLevel'>;

const TOGGLES: Array<{ key: TikTokToggle; creatorKey: 'commentDisabled' | 'duetDisabled' | 'stitchDisabled'; label: string }> = [
  { key: 'disableComment', creatorKey: 'commentDisabled', label: 'Tắt bình luận' },
  { key: 'disableDuet', creatorKey: 'duetDisabled', label: 'Tắt Duet' },
  { key: 'disableStitch', creatorKey: 'stitchDisabled', label: 'Tắt Stitch' },
];

/**
 * Thiết lập riêng của bản đăng TikTok (controlled), theo `creator_info` của tài khoản (`getAdminTikTokCreatorInfo`):
 * hiện tên tài khoản sẽ đăng, chỉ cho chọn quyền riêng tư TikTok cho phép (không chọn sẵn), khoá các tương tác
 * tài khoản đã tắt. Lỗi tải creator info hiện inline (lỗi tải dữ liệu, không phải lỗi thao tác).
 */
export function TikTokSettingsPanel({
  value,
  onChange,
  creator,
  creatorLoading,
  creatorError,
  showPrivacyError,
  disabled,
}: {
  value: TikTokPostSettingsForm;
  onChange: (next: TikTokPostSettingsForm) => void;
  creator?: TikTokCreatorInfoDto;
  creatorLoading: boolean;
  creatorError: unknown;
  /** Người soạn đã bấm lưu mà chưa chọn quyền riêng tư. */
  showPrivacyError?: boolean;
  disabled?: boolean;
}) {
  const privacyId = useId();

  // Creator info vừa tải/đổi: bỏ lựa chọn không còn hợp lệ, bật các tương tác tài khoản đã tắt.
  useEffect(() => {
    if (!creator) return;
    const constrained = applyCreatorConstraints(value, creator);
    if (
      constrained.privacyLevel !== value.privacyLevel ||
      constrained.disableComment !== value.disableComment ||
      constrained.disableDuet !== value.disableDuet ||
      constrained.disableStitch !== value.disableStitch
    ) {
      onChange(constrained);
    }
  }, [creator, value, onChange]);

  const privacyMissing = showPrivacyError && !value.privacyLevel;
  const locked = disabled || !creator;

  return (
    <section aria-labelledby={`${privacyId}-title`} className="mt-2 rounded-lg border border-slate-200 p-4">
      <h3 id={`${privacyId}-title`} className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <TikTokOutlined aria-hidden /> Thiết lập TikTok
      </h3>
      <Alert className="mb-3" type="info" showIcon message={TIKTOK_RULE_HINT} />
      {creatorLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      ) : creatorError != null || !creator ? (
        <Alert
          type="warning"
          showIcon
          message="Không tải được thông tin tài khoản TikTok"
          description={`${socialCommandErrorMessage(creatorError)} Kết nối tài khoản TikTok ở tab Mạng xã hội rồi mở lại.`}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Avatar size={36} src={creator.avatarUrl} icon={<TikTokOutlined />} alt="" />
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium text-slate-800">
                Đăng lên: {creator.nickname ?? creator.username ?? 'Tài khoản TikTok'}
              </div>
              {creator.username && <div className="truncate text-xs text-slate-500">@{creator.username}</div>}
            </div>
          </div>
          {creator.maxVideoPostDurationSec != null && (
            <p className="mb-3 text-xs text-slate-500">
              Video dài tối đa {creator.maxVideoPostDurationSec} giây với tài khoản này.
            </p>
          )}
        </>
      )}
      <label htmlFor={privacyId} className="mb-1 block text-sm text-slate-700">
        Ai có thể xem video này <span className="text-rose-600">*</span>
      </label>
      <Select
        id={privacyId}
        className="w-full"
        placeholder="Chọn quyền riêng tư"
        value={value.privacyLevel}
        status={privacyMissing ? 'error' : undefined}
        options={(creator?.privacyLevelOptions ?? []).map((level) => ({ value: level, label: tiktokPrivacyLabels[level] }))}
        disabled={locked}
        onChange={(privacyLevel) => onChange({ ...value, privacyLevel })}
      />
      <div className="mb-4 min-h-5 text-xs text-rose-600" role={privacyMissing ? 'alert' : undefined}>
        {privacyMissing ? TIKTOK_PRIVACY_REQUIRED : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TOGGLES.map((toggle) => {
          const forcedOff = creator?.[toggle.creatorKey] === true;
          const control = (
            <label key={toggle.key} className="flex items-center gap-2 text-sm text-slate-700">
              <Switch
                size="small"
                checked={value[toggle.key]}
                disabled={locked || forcedOff}
                aria-label={toggle.label}
                onChange={(checked) => onChange({ ...value, [toggle.key]: checked })}
              />
              {toggle.label}
            </label>
          );
          return forcedOff ? (
            <Tooltip key={toggle.key} title="Tài khoản TikTok đã tắt tương tác này trong cài đặt">
              {control}
            </Tooltip>
          ) : (
            control
          );
        })}
      </div>
    </section>
  );
}
