import { describe, expect, it } from 'vitest';
import { FacebookPublishType } from '@/generated/api/content/content.schemas';
import { composablePublishTypeOptions } from '../constants/social.constants';
import { toCoverPayload } from './content-post-cover';

const URL = 'https://res.cloudinary.com/demo/image/upload/v1/a.webp';

describe('toCoverPayload', () => {
  it('ảnh thư viện chỉ gửi coverAssetId', () => {
    expect(toCoverPayload({ coverUrl: URL, coverAssetId: '7' })).toEqual({ coverAssetId: '7' });
  });

  it('URL dán tay gửi coverUrl đã trim', () => {
    expect(toCoverPayload({ coverUrl: `  ${URL} ` })).toEqual({ coverUrl: URL });
  });

  it('sửa bài mà ảnh bìa không đổi thì không gửi trường ảnh', () => {
    expect(toCoverPayload({ coverUrl: URL, coverAssetId: '7' }, { coverUrl: URL, coverAssetId: '7' })).toEqual({});
    expect(toCoverPayload({ coverUrl: URL }, { coverUrl: URL, coverAssetId: null })).toEqual({});
  });

  it('sửa bài đổi ảnh thì gửi ảnh mới', () => {
    expect(toCoverPayload({ coverUrl: URL, coverAssetId: '8' }, { coverUrl: URL, coverAssetId: '7' })).toEqual({ coverAssetId: '8' });
  });
});

describe('composablePublishTypeOptions', () => {
  it('ẩn Video/Reel khi soạn vì upload chỉ nhận ảnh', () => {
    expect(composablePublishTypeOptions().map((option) => option.value)).toEqual([
      FacebookPublishType.FEED,
      FacebookPublishType.PHOTOS,
    ]);
  });

  it('bài đang là Video vẫn thấy loại của nó', () => {
    expect(composablePublishTypeOptions(FacebookPublishType.VIDEO).map((option) => option.value)).toContain(
      FacebookPublishType.VIDEO,
    );
  });
});
