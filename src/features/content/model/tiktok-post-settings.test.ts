import { describe, expect, it } from 'vitest';
import { SOCIAL_CHANNEL } from '../constants/social.constants';
import {
  commercialContentBlocker,
  DEFAULT_TIKTOK_SETTINGS,
  nextSelectedChannels,
  TIKTOK_COMMERCIAL_TEXT,
  TIKTOK_LEGAL_LINK,
  tiktokConsentDeclaration,
  tiktokMediaViolation,
  toTikTokOptionsDto,
} from './tiktok-post-settings';

describe('tiktokMediaViolation', () => {
  it('accepts exactly one video', () => {
    expect(tiktokMediaViolation(['VIDEO'])).toBeUndefined();
  });

  it('rejects no media, images, or more than one item', () => {
    expect(tiktokMediaViolation([])).toBeDefined();
    expect(tiktokMediaViolation(['IMAGE'])).toBeDefined();
    expect(tiktokMediaViolation(['VIDEO', 'VIDEO'])).toBeDefined();
    expect(tiktokMediaViolation(['VIDEO', 'IMAGE'])).toBeDefined();
  });
});

describe('nextSelectedChannels', () => {
  it('keeps the previous selection when the last channel is unchecked', () => {
    expect(nextSelectedChannels([SOCIAL_CHANNEL.FACEBOOK], [])).toEqual([SOCIAL_CHANNEL.FACEBOOK]);
  });

  it('applies a non-empty selection', () => {
    expect(nextSelectedChannels([SOCIAL_CHANNEL.FACEBOOK], [SOCIAL_CHANNEL.FACEBOOK, SOCIAL_CHANNEL.TIKTOK])).toEqual([
      SOCIAL_CHANNEL.FACEBOOK,
      SOCIAL_CHANNEL.TIKTOK,
    ]);
  });
});

describe('commercial content disclosure', () => {
  it('requires a choice once the toggle is on', () => {
    expect(commercialContentBlocker(DEFAULT_TIKTOK_SETTINGS)).toBeUndefined();
    expect(
      commercialContentBlocker({ commercialContent: { enabled: true, yourBrand: false, brandedContent: false } }),
    ).toBe(TIKTOK_COMMERCIAL_TEXT.UNSPECIFIED);
  });

  it('rejects branded content with "only me" privacy', () => {
    expect(
      commercialContentBlocker({
        privacyLevel: 'SELF_ONLY',
        commercialContent: { enabled: true, yourBrand: false, brandedContent: true },
      }),
    ).toBe(TIKTOK_COMMERCIAL_TEXT.BRANDED_PRIVATE);
    expect(
      commercialContentBlocker({
        privacyLevel: 'SELF_ONLY',
        commercialContent: { enabled: true, yourBrand: true, brandedContent: false },
      }),
    ).toBeUndefined();
  });

  it('drops sub-choices when the toggle is off before sending', () => {
    const dto = toTikTokOptionsDto({
      ...DEFAULT_TIKTOK_SETTINGS,
      commercialContent: { enabled: false, yourBrand: true, brandedContent: true },
      isAigc: true,
    });
    expect(dto.commercialContent).toEqual({ enabled: false, yourBrand: false, brandedContent: false });
    expect(dto.isAigc).toBe(true);
  });
});

describe('tiktokConsentDeclaration', () => {
  it('uses the Music Usage Confirmation sentence without branded content', () => {
    const declaration = tiktokConsentDeclaration(false);
    expect(declaration.en).toBe("By posting, you agree to TikTok's Music Usage Confirmation.");
    expect(declaration.links.map((link) => link.href)).toEqual([TIKTOK_LEGAL_LINK.MUSIC_USAGE]);
  });

  it('adds the Branded Content Policy when branded content is disclosed', () => {
    const declaration = tiktokConsentDeclaration(true);
    expect(declaration.en).toBe("By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation.");
    expect(declaration.links.map((link) => link.href)).toEqual([
      TIKTOK_LEGAL_LINK.BRANDED_CONTENT_POLICY,
      TIKTOK_LEGAL_LINK.MUSIC_USAGE,
    ]);
  });
});
