import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { KNOWLEDGE_ERROR_CODE } from '../constants/knowledge.constants';
import { attachKnowledgeErrorMessage, knowledgeTransitionErrorMessage } from './knowledge-command-error';

const apiError = (code: string, message = 'server message', status = 409) =>
  new ApiError(status, { statusCode: status, code, message });

describe('attachKnowledgeErrorMessage', () => {
  it('explains ALREADY_ATTACHED', () => {
    expect(attachKnowledgeErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.ALREADY_ATTACHED))).toContain('đã được gắn');
  });

  it('explains SOURCE_NOT_VISIBLE', () => {
    expect(attachKnowledgeErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.SOURCE_NOT_VISIBLE))).toContain('không còn hiển thị');
  });

  it('explains a 403 branch-scope denial', () => {
    expect(
      attachKnowledgeErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.BRANCH_SCOPE_DENIED, 'denied', 403)),
    ).toContain('không có quyền với chi nhánh');
  });

  it('uses the API message for other codes, including SOURCE_EMPTY', () => {
    expect(attachKnowledgeErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.SOURCE_EMPTY, 'empty'))).toBe('empty');
  });

  it('falls back for non-API errors', () => {
    expect(attachKnowledgeErrorMessage(new Error('net'))).toBe('net');
    expect(attachKnowledgeErrorMessage(null)).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
  });
});

describe('knowledgeTransitionErrorMessage', () => {
  it('asks to reload on version conflict and invalid transition', () => {
    for (const code of [KNOWLEDGE_ERROR_CODE.VERSION_CONFLICT, KNOWLEDGE_ERROR_CODE.INVALID_TRANSITION]) {
      expect(knowledgeTransitionErrorMessage(apiError(code))).toContain('đã tải lại');
    }
  });

  it('treats a 404 as not found within the branch scope without guessing why', () => {
    const message = knowledgeTransitionErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.NOT_FOUND, 'nf', 404));
    expect(message).toContain('phạm vi chi nhánh');
    expect(message).not.toBe('nf');
  });

  it('explains a 403 branch-scope denial', () => {
    expect(
      knowledgeTransitionErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.BRANCH_SCOPE_DENIED, 'denied', 403)),
    ).toContain('không có quyền với chi nhánh');
  });

  it('explains source problems when publishing', () => {
    expect(knowledgeTransitionErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.SOURCE_NOT_VISIBLE))).toContain('đang ẩn');
    expect(knowledgeTransitionErrorMessage(apiError(KNOWLEDGE_ERROR_CODE.SOURCE_EMPTY))).toContain('không có nội dung');
  });

  it('falls back to the API or generic message', () => {
    expect(knowledgeTransitionErrorMessage(apiError('OTHER', 'other'))).toBe('other');
    expect(knowledgeTransitionErrorMessage(undefined)).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
  });
});
