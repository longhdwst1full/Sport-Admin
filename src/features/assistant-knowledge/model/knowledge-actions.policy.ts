import { KNOWLEDGE_PERMISSION } from '../constants/knowledge.constants';
import type { KnowledgeDocument } from './knowledge-document.types';

export type KnowledgeAction = 'publish' | 'archive';

/**
 * Thao tác hiển thị cho một tài liệu, khớp ma trận của API (`knowledge-document.service.ts`): xuất bản được
 * khi chưa PUBLISHED (nháp hoặc đã lưu trữ — xuất bản lại là dựng lại chỉ mục), lưu trữ được khi chưa ARCHIVED.
 *
 * PERMISSION: chỉ là affordance; API vẫn trả 409 `KNOWLEDGE_INVALID_TRANSITION` nếu hai bên lệch.
 */
export function availableKnowledgeActions(
  document: Pick<KnowledgeDocument, 'status'>,
  permissions: ReadonlySet<string>,
): KnowledgeAction[] {
  if (!permissions.has(KNOWLEDGE_PERMISSION.MANAGE)) return [];
  const actions: KnowledgeAction[] = [];
  if (document.status !== 'PUBLISHED') actions.push('publish');
  if (document.status !== 'ARCHIVED') actions.push('archive');
  return actions;
}
