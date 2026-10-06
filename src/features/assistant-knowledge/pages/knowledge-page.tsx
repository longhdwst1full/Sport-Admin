import { useMemo, useState } from 'react';
import { LinkOutlined } from '@ant-design/icons';
import { App, Button, Select } from 'antd';
import { usePermissions } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { AttachKnowledgePostModal } from '../components/attach-knowledge-post-modal';
import { KnowledgeDocumentTable } from '../components/knowledge-document-table';
import { KnowledgeAudience, KnowledgeStatus } from '@/generated/api/assistant/assistant.schemas';
import { BranchSelect } from '@/features/organization';
import {
  ALL_BRANCHES_LABEL,
  KNOWLEDGE_PAGE_SIZE,
  KNOWLEDGE_PERMISSION,
  knowledgeAudienceOptions,
  knowledgeStatusOptions,
  knowledgeStatusPresentation,
} from '../constants/knowledge.constants';
import { useKnowledgeCommand, useKnowledgeDocuments } from '../hooks/use-knowledge-documents';
import type { KnowledgeAction } from '../model/knowledge-actions.policy';
import { attachKnowledgeErrorMessage, knowledgeTransitionErrorMessage } from '../model/knowledge-command-error';
import type { AttachKnowledgePostInput, KnowledgeDocument } from '../model/knowledge-document.types';

const actionConfirm: Record<KnowledgeAction, { title: string; okText: string; consequence: string; success: string }> = {
  publish: {
    title: 'Xuất bản tài liệu cho trợ lý',
    okText: 'Xuất bản',
    consequence: 'Trợ lý bắt đầu dùng nội dung này để trả lời đúng đối tượng và chi nhánh đã chọn.',
    success: 'Đã xuất bản tài liệu',
  },
  archive: {
    title: 'Lưu trữ tài liệu',
    okText: 'Lưu trữ',
    consequence: 'Trợ lý ngừng dùng nội dung này; bài CMS gốc không bị thay đổi.',
    success: 'Đã lưu trữ tài liệu',
  },
};

/**
 * Kho tri thức của trợ lý: gắn bài CMS (đối tượng + chi nhánh), xuất bản và lưu trữ. Bộ lọc nằm trên URL.
 */
export function KnowledgePage() {
  const { message, modal } = App.useApp();
  const permissions = usePermissions();
  const url = useUrlFilters();
  const status = url.getEnum('status', KnowledgeStatus);
  const audience = url.getEnum('audience', KnowledgeAudience);
  const branchId = url.get('branch');
  const [page, setPage] = useListPageReset([status, audience, branchId]);
  const [attachOpen, setAttachOpen] = useState(false);
  const command = useKnowledgeCommand();
  const canManage = permissions.has(KNOWLEDGE_PERMISSION.MANAGE);

  const list = useKnowledgeDocuments({ page, limit: KNOWLEDGE_PAGE_SIZE, status, audience, branchId });
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  const openAttach = () => {
    command.reset();
    setAttachOpen(true);
  };
  const closeAttach = () => {
    if (command.isPending) return;
    command.reset();
    setAttachOpen(false);
  };
  const attach = (input: AttachKnowledgePostInput) => {
    command.mutate({ action: 'attach', body: input }, {
      onSuccess: () => {
        void message.success('Đã gắn bài vào kho tri thức (ở trạng thái nháp)');
        command.reset();
        setAttachOpen(false);
      },
      onError: (error) => {
        void message.error(attachKnowledgeErrorMessage(error));
      },
    });
  };

  const confirmAction = (document: KnowledgeDocument, action: KnowledgeAction) => {
    const meta = actionConfirm[action];
    modal.confirm({
      title: meta.title,
      okText: meta.okText,
      cancelText: 'Huỷ',
      okButtonProps: { danger: action === 'archive' },
      content: (
        <div className="space-y-1">
          <div><strong>{document.title}</strong></div>
          <div>Trạng thái hiện tại: {knowledgeStatusPresentation[document.status].label} · phiên bản {document.version}</div>
          <div className="text-slate-500">{meta.consequence}</div>
        </div>
      ),
      // CONCURRENCY: dùng version của dòng đang hiển thị; nếu người khác vừa đổi, API trả 409 và danh sách tự tải lại.
      onOk: async () => {
        try {
          await command.mutateAsync({ action, documentId: document.id, expectedVersion: document.version });
          void message.success(meta.success);
        } catch (error) {
          void message.error(knowledgeTransitionErrorMessage(error));
          throw error;
        }
      },
    });
  };

  return (
    <>
      <ManagementPage
        eyebrow="AI assistant"
        title="Tri thức trợ lý"
        description="Chọn bài CMS mà trợ lý được dùng để trả lời, theo đối tượng và chi nhánh."
        actions={(
          <Button type="primary" icon={<LinkOutlined />} disabled={!canManage} onClick={openAttach}>
            Gắn bài CMS
          </Button>
        )}
        filters={(
          <FilterBar actions={<RefreshButton onRefresh={list.refetch} loading={list.isFetching} />}>
            <Select
              allowClear
              className="min-w-44"
              value={status}
              onChange={(value?: string) => url.set('status', value)}
              placeholder="Trạng thái"
              options={knowledgeStatusOptions}
            />
            <Select
              allowClear
              className="min-w-44"
              value={audience}
              onChange={(value?: string) => url.set('audience', value)}
              placeholder="Đối tượng"
              options={knowledgeAudienceOptions}
            />
            <BranchSelect
              allowClear
              className="min-w-48"
              placeholder={ALL_BRANCHES_LABEL}
              value={branchId}
              onChange={(value) => url.set('branch', value)}
            />
          </FilterBar>
        )}
      >
        {list.isError && (
          <QueryErrorAlert error={list.error} message="Không tải được kho tri thức" retry={() => void list.refetch()} />
        )}
        <KnowledgeDocumentTable
          rows={rows}
          loading={list.isLoading}
          page={page}
          total={list.data?.total ?? 0}
          emptyText="Chưa có tài liệu phù hợp bộ lọc."
          permissions={permissions}
          actionsDisabled={command.isPending}
          onPageChange={setPage}
          onAction={confirmAction}
        />
      </ManagementPage>
      <AttachKnowledgePostModal
        open={attachOpen}
        submitting={command.isPending}
        onSubmit={attach}
        onClose={closeAttach}
      />
    </>
  );
}
