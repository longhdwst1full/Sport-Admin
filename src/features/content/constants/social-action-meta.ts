import { FB_POST_ID_PATTERN, TIKTOK_POST_ID_PATTERN } from './social.constants';
import type { SocialAction, SocialDeleteMode, TikTokDeleteMode } from '../model/social-actions.policy';

/** Lệnh mở bằng modal xác nhận (soạn/sửa nháp mở drawer riêng). */
export type SocialModalAction = Exclude<SocialAction, 'createDraft' | 'editDraft'>;
/** TikTok không có lệnh sửa caption sau khi đăng. */
export type TikTokModalAction = Exclude<SocialModalAction, 'editCaption'>;

/** Tiêu đề, nút xác nhận và hệ quả nghiệp vụ hiển thị trong modal lệnh (`04-permissions-transitions.md`). */
export interface ActionMeta {
  title: string;
  okText: string;
  consequence: string;
  danger?: boolean;
}

export const FACEBOOK_ACTION_META: Record<SocialModalAction, ActionMeta> = {
  submit: {
    title: 'Gửi duyệt bài Facebook',
    okText: 'Gửi duyệt',
    consequence: 'Bài chuyển sang Chờ duyệt; người có quyền đăng sẽ duyệt, đăng ngay hoặc hẹn giờ.',
  },
  approve: {
    title: 'Đăng bài lên Facebook',
    okText: 'Đăng',
    consequence: 'Bài được đăng lên Facebook Page ngay hoặc vào giờ hẹn. Bài đã đăng sẽ công khai với mọi người.',
  },
  retry: {
    title: 'Đăng lại bài lỗi',
    okText: 'Đăng lại',
    consequence: 'Gửi lại bài lên Facebook Page. Chỉ dùng khi chắc chắn lần trước chưa lên Page.',
  },
  reject: {
    title: 'Từ chối bài Facebook',
    okText: 'Từ chối',
    consequence: 'Bài quay về Nháp để người soạn sửa lại.',
    danger: true,
  },
  reconcile: {
    title: 'Đối soát với Facebook Page',
    okText: 'Đối soát',
    consequence:
      'Lần đăng trước không rõ kết quả. Hệ thống tìm bài trên Page; nếu không tự kết luận được, nhập ID bài tìm thấy hoặc xác nhận chưa đăng.',
  },
  cancel: {
    title: 'Huỷ bản đăng Facebook',
    okText: 'Huỷ bản đăng',
    consequence: 'Bản đăng chưa lên Page chuyển sang Đã xoá. Bài website (nếu có) không bị ảnh hưởng.',
    danger: true,
  },
  delete: {
    title: 'Xoá bài trên Facebook',
    okText: 'Xoá trên Facebook',
    consequence: 'Bài bị xoá khỏi Facebook Page và không khôi phục được. Bài website (nếu có) không bị ảnh hưởng.',
    danger: true,
  },
  editCaption: {
    title: 'Sửa nội dung trên Facebook',
    okText: 'Cập nhật lên Facebook',
    consequence: 'Nội dung bài trên Page được thay bằng nội dung mới.',
  },
};

/** Lệnh TikTok: không hẹn giờ/Reel, không sửa caption; xoá chỉ là thôi theo dõi (TikTok không có API xoá). */
export const TIKTOK_ACTION_META: Record<TikTokModalAction, ActionMeta> = {
  submit: {
    title: 'Gửi duyệt bài TikTok',
    okText: 'Gửi duyệt',
    consequence: 'Bản TikTok chuyển sang Chờ duyệt; người có quyền đăng sẽ duyệt và đăng.',
  },
  approve: {
    title: 'Đăng video lên TikTok',
    okText: 'Đăng ngay',
    consequence:
      'Video được tải lên tài khoản TikTok và đăng ngay (TikTok không hỗ trợ hẹn giờ). Sau khi đăng không sửa được caption. TikTok có thể mất vài phút để xử lý video.',
  },
  retry: {
    title: 'Đăng lại video TikTok',
    okText: 'Đăng lại',
    consequence: 'Gửi lại video lên TikTok. Chỉ dùng khi chắc chắn lần trước chưa lên TikTok.',
  },
  reject: {
    title: 'Từ chối bài TikTok',
    okText: 'Từ chối',
    consequence: 'Bản TikTok quay về Nháp để người soạn sửa lại.',
    danger: true,
  },
  reconcile: {
    title: 'Đối soát với TikTok',
    okText: 'Đối soát',
    consequence:
      'Lần đăng trước không rõ kết quả. Hệ thống hỏi lại TikTok; nếu TikTok chưa kết luận, kiểm tra tài khoản rồi nhập id video hoặc xác nhận chưa đăng.',
  },
  cancel: {
    title: 'Huỷ bản đăng TikTok',
    okText: 'Huỷ bản đăng',
    consequence: 'Bản TikTok chưa đăng chuyển sang Đã xoá. Bài website và bản Facebook (nếu có) không bị ảnh hưởng.',
    danger: true,
  },
  delete: {
    title: 'Xoá bản đăng TikTok',
    okText: 'Xoá',
    consequence: 'Bản TikTok bị xoá trong hệ thống.',
    danger: true,
  },
};

export const TIKTOK_DELETE_META: Record<Exclude<TikTokDeleteMode, 'NONE'>, ActionMeta> = {
  LIVE: {
    title: 'Ngừng theo dõi video TikTok',
    okText: 'Ngừng theo dõi',
    consequence:
      'TikTok không cho xoá video qua API: hệ thống chỉ ngừng theo dõi bài này (không đồng bộ chỉ số nữa). Video VẪN CÒN trên TikTok — chủ tài khoản tự xoá trong ứng dụng TikTok nếu cần.',
    danger: true,
  },
  LOCAL: {
    title: 'Xoá bản TikTok (chưa đăng)',
    okText: 'Xoá',
    consequence:
      'Video chưa lên TikTok nên chỉ bị xoá trong hệ thống. Bài không còn kênh nào sẽ biến khỏi danh sách; bài website giữ nguyên.',
    danger: true,
  },
  RECONCILE_FIRST: {
    title: 'Xoá bản đăng TikTok',
    okText: 'Xoá',
    consequence: 'Video đang được đăng hoặc chưa rõ đã lên TikTok chưa — đợi hệ thống xử lý xong hoặc Đối soát trước khi xoá.',
    danger: true,
  },
};

/** Lệnh xoá đổi tiêu đề/hệ quả theo nhánh (owner 2026-10-03: xoá được mọi trạng thái). */
export const FACEBOOK_DELETE_META: Record<Exclude<SocialDeleteMode, 'FACEBOOK' | 'NONE'>, ActionMeta> = {
  LOCAL: {
    title: 'Xoá bài (chưa đăng lên Facebook)',
    okText: 'Xoá bài',
    consequence:
      'Bài chưa lên Facebook Page nên chỉ bị xoá trong hệ thống. Bài chỉ đăng Facebook sẽ biến khỏi danh sách và nhả ảnh/video; bài website giữ nguyên, chỉ bỏ bản đăng Facebook.',
    danger: true,
  },
  RECONCILE_FIRST: {
    title: 'Xoá bài trên Facebook',
    okText: 'Xoá',
    consequence: 'Chưa rõ bài đã lên Facebook chưa — hãy Đối soát trước khi xoá',
    danger: true,
  },
};

/** Nội dung các lựa chọn đối soát theo kênh. */
export interface ReconcileCopy {
  auto: string;
  postId: string;
  notPublished: string;
  postIdLabel: string;
  postIdExtra?: string;
  postIdRequired: string;
  postIdPattern: RegExp;
  postIdPatternMessage: string;
  postIdPlaceholder: string;
  notPublishedWarning: string;
}

export const FACEBOOK_RECONCILE_COPY: ReconcileCopy = {
  auto: 'Tự tìm bài trên Page',
  postId: 'Tôi đã tìm thấy bài trên Page — nhập ID bài',
  notPublished: 'Tôi đã kiểm tra Page — bài chưa được đăng',
  postIdLabel: 'ID bài trên Facebook',
  postIdRequired: 'Nhập ID bài',
  postIdPattern: FB_POST_ID_PATTERN,
  postIdPatternMessage: 'ID dạng {pageId}_{postId}, ví dụ 1234567890_9876543210',
  postIdPlaceholder: '1234567890_9876543210',
  notPublishedWarning: 'Bài sẽ chuyển sang Lỗi để có thể đăng lại.',
};

export const TIKTOK_RECONCILE_COPY: ReconcileCopy = {
  auto: 'Hỏi lại trạng thái đăng từ TikTok',
  postId: 'Video đã lên TikTok — nhập id video',
  notPublished: 'Tôi đã kiểm tra tài khoản — video chưa được đăng',
  postIdLabel: 'Id video TikTok',
  postIdExtra: 'Số cuối trong link video, ví dụ tiktok.com/@shop/video/7291234567890123456.',
  postIdRequired: 'Nhập id video',
  postIdPattern: TIKTOK_POST_ID_PATTERN,
  postIdPatternMessage: 'Id video chỉ gồm chữ số',
  postIdPlaceholder: '7291234567890123456',
  notPublishedWarning: 'Bản TikTok sẽ chuyển sang Lỗi để có thể đăng lại.',
};
