import { useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  useListAdminShippingConsultations,
  useUpdateAdminManualShippingQuote,
} from "@/generated/api/checkout/checkout";
import {
  ListAdminShippingConsultationsStatus,
  type AdminShippingConsultationDto,
} from "@/generated/api/checkout/models";
import { ManagementPage } from "@/foundation/management";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const consultationStatus = {
  [ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION]: {
    color: "gold",
    label: "Chờ tư vấn",
  },
  [ListAdminShippingConsultationsStatus.QUOTED]: {
    color: "green",
    label: "Đã chốt phí",
  },
} as const;

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListAdminShippingConsultationsStatus>(
    ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION,
  );
  const [selected, setSelected] =
    useState<AdminShippingConsultationDto | null>(null);
  const [shippingFee, setShippingFee] = useState(200000);
  const [etaMinDays, setEtaMinDays] = useState(1);
  const [etaMaxDays, setEtaMaxDays] = useState(3);
  const [provider, setProvider] = useState("MANUAL");
  const [agreementNote, setAgreementNote] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const consultations = useListAdminShippingConsultations({
    page,
    limit: 10,
    status,
  });
  const manualQuote = useUpdateAdminManualShippingQuote();
  const rows = consultations.data?.items ?? [];
  const currentPageSubtotal = rows.reduce(
    (sum, item) => sum + Number(item.itemSubtotal),
    0,
  );

  const openConsultation = (item: AdminShippingConsultationDto) => {
    setSelected(item);
    setShippingFee(Number(item.shippingTotal ?? 200000));
    setEtaMinDays(item.etaMinDays ?? 1);
    setEtaMaxDays(item.etaMaxDays ?? 3);
    setProvider(item.shippingProvider ?? "MANUAL");
    setAgreementNote("");
    setSuccessMessage("");
    manualQuote.reset();
  };

  const saveConsultation = async () => {
    if (!selected) return;
    try {
      const updated = await manualQuote.mutateAsync({
        checkoutToken: selected.checkoutToken,
        data: {
          shippingFee: String(shippingFee),
          etaMinDays,
          etaMaxDays,
          expectedVersion: selected.version,
          agreementNote: agreementNote.trim(),
          provider,
        },
      });
      setSuccessMessage(
        `Đã cập nhật ${updated.branchName}: ${money.format(Number(updated.shippingTotal ?? 0))}. Khách có thể kiểm tra lại và xác nhận giữ hàng.`,
      );
      setSelected(null);
      await consultations.refetch();
    } catch {
      // Mutation state renders the normalized API error inside the drawer.
    }
  };

  return (
    <>
      <ManagementPage
        eyebrow="Sales operations"
        title="Tư vấn giao hàng"
        description="Tiếp nhận checkout cồng kềnh hoặc giao xe khách, gọi khách và chốt phí trước khi khách xác nhận giữ hàng."
        dataNotice="Bảng này lấy trực tiếp từ API checkout theo quyền chi nhánh. Order, Payment và Fulfillment đầy đủ được triển khai ở Sprint 4."
        metrics={[
          {
            key: "total",
            label: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? "Đang chờ xử lý"
              : "Đã chốt phí",
            value: consultations.data?.total ?? 0,
            icon: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? <ClockCircleOutlined />
              : <CheckCircleOutlined />,
            tone: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? "orange"
              : "green",
          },
          {
            key: "page",
            label: "Yêu cầu trên trang",
            value: rows.length,
            icon: <ShoppingCartOutlined />,
          },
          {
            key: "lines",
            label: "Dòng sản phẩm",
            value: rows.reduce((sum, item) => sum + item.items.length, 0),
            icon: <PhoneOutlined />,
            tone: "blue",
          },
          {
            key: "subtotal",
            label: "Giá trị hàng trên trang",
            value: money.format(currentPageSubtotal),
            icon: <DollarOutlined />,
            hint: "Giá đã gồm VAT",
          },
        ]}
        filters={
          <Select
            className="min-w-56"
            value={status}
            options={Object.entries(consultationStatus).map(
              ([value, presentation]) => ({
                value,
                label: presentation.label,
              }),
            )}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
              setSuccessMessage("");
            }}
          />
        }
      >
        {successMessage && (
          <Alert
            className="mb-5"
            type="success"
            showIcon
            closable
            message={successMessage}
            onClose={() => setSuccessMessage("")}
          />
        )}
        {consultations.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được yêu cầu tư vấn"
            description="Vui lòng kiểm tra phiên đăng nhập, quyền order.manage và phạm vi chi nhánh."
            action={<Button onClick={() => consultations.refetch()}>Thử lại</Button>}
          />
        )}
        <Table
          rowKey="checkoutToken"
          dataSource={rows}
          loading={consultations.isLoading || consultations.isFetching}
          scroll={{ x: 1050 }}
          locale={{ emptyText: "Không có checkout nào ở trạng thái đã chọn." }}
          pagination={{
            current: page,
            pageSize: 10,
            total: consultations.data?.total ?? 0,
            showSizeChanger: false,
            onChange: setPage,
          }}
          columns={[
            {
              title: "Khách hàng",
              key: "customer",
              fixed: "left",
              width: 220,
              render: (_, row) => (
                <div>
                  <Typography.Text strong>{row.recipient.recipient}</Typography.Text>
                  <div className="text-xs text-slate-500">{row.recipient.phone}</div>
                </div>
              ),
            },
            {
              title: "Chi nhánh",
              dataIndex: "branchName",
              width: 180,
            },
            {
              title: "Sản phẩm",
              key: "items",
              width: 260,
              render: (_, row) => (
                <div>
                  <strong>{row.items[0]?.name ?? "Không có sản phẩm"}</strong>
                  <div className="text-xs text-slate-500">
                    {row.items.length} dòng · {row.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                  </div>
                </div>
              ),
            },
            {
              title: "Tạm tính",
              dataIndex: "itemSubtotal",
              align: "right",
              width: 150,
              render: (value) => <strong>{money.format(Number(value))}</strong>,
            },
            {
              title: "Thanh toán",
              dataIndex: "paymentMethod",
              width: 130,
              render: (value) => <Tag>{value === "COD" ? "Thu hộ COD" : "Chuyển khoản"}</Tag>,
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 130,
              render: (value) => {
                const presentation = consultationStatus[value as keyof typeof consultationStatus];
                return <Tag color={presentation.color}>{presentation.label}</Tag>;
              },
            },
            {
              title: "Tạo lúc",
              dataIndex: "createdAt",
              width: 170,
              render: (value) => new Date(value).toLocaleString("vi-VN"),
            },
            {
              title: "",
              key: "actions",
              fixed: "right",
              width: 72,
              render: (_, row) => (
                <Button
                  type="text"
                  aria-label={`Xem yêu cầu của ${row.recipient.recipient}`}
                  icon={<EyeOutlined />}
                  onClick={() => openConsultation(row)}
                />
              ),
            },
          ]}
        />
      </ManagementPage>

      <Drawer
        width={620}
        open={Boolean(selected)}
        title="Chốt phí giao hàng với khách"
        onClose={() => setSelected(null)}
        destroyOnClose
      >
        {selected && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Khách hàng">
                {selected.recipient.recipient} · {selected.recipient.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {[selected.recipient.addressLine, selected.recipient.ward, selected.recipient.district, selected.recipient.province]
                  .filter(Boolean)
                  .join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Chi nhánh">
                {selected.branchName}
              </Descriptions.Item>
              <Descriptions.Item label="Sản phẩm">
                {selected.items.map((item) => `${item.name} ×${item.quantity}`).join("; ")}
              </Descriptions.Item>
              <Descriptions.Item label="Tạm tính">
                {money.format(Number(selected.itemSubtotal))}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú khách">
                {selected.customerNote || "Không có"}
              </Descriptions.Item>
            </Descriptions>

            {selected.status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <Typography.Title level={5} className="!mt-0">Thông tin đã thống nhất</Typography.Title>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Phí giao <span className="text-red-500">*</span>
                    <InputNumber className="mt-1 !w-full" min={0} value={shippingFee} onChange={(value) => setShippingFee(value ?? 0)} addonAfter="VND" />
                  </label>
                  <label className="text-sm font-medium">
                    Hình thức <span className="text-red-500">*</span>
                    <Select
                      className="mt-1 w-full"
                      value={provider}
                      options={[
                        { value: "MANUAL", label: "Giao thỏa thuận" },
                        { value: "COACH_BUS", label: "Gửi xe khách" },
                        { value: "IN_HOUSE", label: "Cửa hàng tự giao" },
                      ]}
                      onChange={setProvider}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    ETA tối thiểu <span className="text-red-500">*</span>
                    <InputNumber className="mt-1 !w-full" min={0} value={etaMinDays} onChange={(value) => setEtaMinDays(value ?? 0)} addonAfter="ngày" />
                  </label>
                  <label className="text-sm font-medium">
                    ETA tối đa <span className="text-red-500">*</span>
                    <InputNumber className="mt-1 !w-full" min={0} value={etaMaxDays} onChange={(value) => setEtaMaxDays(value ?? 0)} addonAfter="ngày" />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Nội dung khách đã đồng ý <span className="text-red-500">*</span>
                    <Input.TextArea
                      className="mt-1"
                      rows={4}
                      value={agreementNote}
                      onChange={(event) => setAgreementNote(event.target.value)}
                      placeholder="Ví dụ: Đã gọi số 09..., khách đồng ý phí 100.000đ, giao trong 2-3 ngày."
                    />
                  </label>
                </div>
                {manualQuote.isError && (
                  <Alert
                    className="mt-4"
                    type="error"
                    showIcon
                    message="Không lưu được phí đã thống nhất"
                    description="Dữ liệu có thể vừa thay đổi hoặc phiên của bạn không có quyền với chi nhánh này. Hãy tải lại danh sách rồi thử lại."
                  />
                )}
                <Button
                  type="primary"
                  className="mt-4"
                  loading={manualQuote.isPending}
                  disabled={agreementNote.trim().length < 10 || etaMaxDays < etaMinDays}
                  onClick={() => void saveConsultation()}
                >
                  Lưu và mở lại quote cho khách
                </Button>
              </div>
            ) : (
              <Alert type="success" showIcon message="Phí giao đã được chốt; đang chờ khách xác nhận giữ hàng." />
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
}
