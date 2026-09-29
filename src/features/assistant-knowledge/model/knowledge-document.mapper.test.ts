import { describe, expect, it } from 'vitest';
import {
  toAttachKnowledgePostDto,
  toKnowledgeDocument,
  toKnowledgeDocumentPage,
  toListAdminKnowledgeDocumentsParams,
} from './knowledge-document.mapper';

const dto = {
  id: 'd1',
  title: 'Chính sách',
  sourceType: 'MANUAL',
  sourceId: null,
  audience: 'PUBLIC',
  branchId: null,
  status: 'DRAFT',
  version: 3,
  chunkCount: 0,
  reindexedAt: null,
  archivedAt: null,
  updatedAt: '2026-09-01T00:00:00Z',
} as never;

describe('toKnowledgeDocument', () => {
  it('turns nullable fields into undefined', () => {
    const doc = toKnowledgeDocument(dto);
    expect(doc.sourceId).toBeUndefined();
    expect(doc.branchId).toBeUndefined();
    expect(doc.reindexedAt).toBeUndefined();
    expect(doc.archivedAt).toBeUndefined();
    expect(doc).toMatchObject({ id: 'd1', version: 3, chunkCount: 0, status: 'DRAFT' });
  });

  it('keeps present values', () => {
    const doc = toKnowledgeDocument({ ...(dto as object), sourceId: 'p1', branchId: 'b1', reindexedAt: 'r' } as never);
    expect(doc).toMatchObject({ sourceId: 'p1', branchId: 'b1', reindexedAt: 'r' });
  });
});

describe('toKnowledgeDocumentPage', () => {
  it('maps items and total', () => {
    const page = toKnowledgeDocumentPage({ items: [dto, dto], meta: { total: 9 } } as never);
    expect(page.total).toBe(9);
    expect(page.items).toHaveLength(2);
  });
});

describe('toListAdminKnowledgeDocumentsParams', () => {
  it('omits empty filters', () => {
    expect(toListAdminKnowledgeDocumentsParams({ page: 1, limit: 20, branchId: '' })).toEqual({ page: 1, limit: 20 });
  });

  it('includes set filters', () => {
    expect(
      toListAdminKnowledgeDocumentsParams({ page: 2, limit: 5, status: 'PUBLISHED', audience: 'STAFF', branchId: 'b1' }),
    ).toEqual({ page: 2, limit: 5, status: 'PUBLISHED', audience: 'STAFF', branchId: 'b1' });
  });
});

describe('toAttachKnowledgePostDto', () => {
  it('sends null branchId for all branches', () => {
    expect(toAttachKnowledgePostDto({ postId: 'p', audience: 'PUBLIC' })).toEqual({
      postId: 'p',
      audience: 'PUBLIC',
      branchId: null,
    });
  });

  it('keeps a chosen branch', () => {
    expect(toAttachKnowledgePostDto({ postId: 'p', audience: 'STAFF', branchId: 'b1' }).branchId).toBe('b1');
  });
});
