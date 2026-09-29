import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Typography, type TableColumnType } from 'antd';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { formatDateTime } from '@/lib/format/datetime';
import {
  ALL_BRANCHES_LABEL,
  KNOWLEDGE_PAGE_SIZE,
  knowledgeAudiencePresentation,
  knowledgeSourceTypeLabels,
  knowledgeStatusPresentation,
} from '../constants/knowledge.constants';
import { useBranchLabels } from '../hooks/use-branch-labels';
import { availableKnowledgeActions, type KnowledgeAction } from '../model/knowledge-actions.policy';
import type { KnowledgeDocument } from '../model/knowledge-document.types';

const actionMeta: Record<KnowledgeAction, { label: string; icon: ReactNode; danger?: boolean }> = {
  publish: { label: 'Xuất bản cho trợ lý', icon: <CloudUploadOutlined /> },
  archive: { label: 'Lưu trữ', icon: <InboxOutlined />, danger: true },
};

export function KnowledgeDocumentTable({
  rows,
  loading,
  page,
  total,
  emptyText,
  permissions,
  actionsDisabled,
  onPageChange,
  onAction,
}: {
  rows: KnowledgeDocument[];
  loading: boolean;
  page: number;
  total: number;
  emptyText: string;
  permissions: ReadonlySet<string>;
  actionsDisabled: boolean;
  onPageChange: (page: number) => void;
  onAction: (document: KnowledgeDocument, action: KnowledgeAction) => void;
}) {
  const branchLabel = useBranchLabels();
  const columns: TableColumnType<KnowledgeDocument>[] = [
    {
      key: 'title',
      title: 'Tiêu đề',
      render: (_, row) => <Typography.Text strong>{row.title}</Typography.Text>,
    },
    {
      key: 'source',
      title: 'Nguồn',
      width: 160,
      // CONTRACT: DTO chỉ trả loại nguồn + id bài CMS, chưa kèm tiêu đề/slug bài gốc.
      render: (_, row) => (
        <div>
          <div>{knowledgeSourceTypeLabels[row.sourceType]}</div>
          {row.sourceId && <div className="text-xs text-slate-500">#{row.sourceId}</div>}
        </div>
      ),
    },
    {
      key: 'audience',
      title: 'Đối tượng',
      width: 130,
      render: (_, row) => <StatusTag status={row.audience} presentations={knowledgeAudiencePresentation} />,
    },
    {
      key: 'branch',
      title: 'Chi nhánh',
      width: 170,
      render: (_, row) => branchLabel(row.branchId) ?? <span className="text-slate-500">{ALL_BRANCHES_LABEL}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 130,
      render: (_, row) => <StatusTag status={row.status} presentations={knowledgeStatusPresentation} />,
    },
    { key: 'version', title: 'Phiên bản', width: 100, dataIndex: 'version' },
    { key: 'chunkCount', title: 'Số đoạn', width: 90, dataIndex: 'chunkCount' },
    {
      key: 'reindexedAt',
      title: 'Lập chỉ mục lúc',
      width: 160,
      render: (_, row) => formatDateTime(row.reindexedAt),
    },
    {
      key: 'action',
      title: '',
      width: 96,
      fixed: 'right',
      render: (_, row) => (
        <TableActions>
          {availableKnowledgeActions(row, permissions).map((action) => (
            <TableActionButton
              key={action}
              label={actionMeta[action].label}
              icon={actionMeta[action].icon}
              danger={actionMeta[action].danger}
              disabled={actionsDisabled}
              onClick={() => onAction(row, action)}
            />
          ))}
        </TableActions>
      ),
    },
  ];

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1280 }}
      locale={{ emptyText }}
      pagination={{
        current: page,
        pageSize: KNOWLEDGE_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} tài liệu`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
