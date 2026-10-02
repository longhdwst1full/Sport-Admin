import { defineConfig } from 'orval';

const CONTRACT_BASE = './contracts/admin';
const OUTPUT_BASE = './src/generated/api';

interface OperationOverride {
  requestOptions: boolean;
  mutator?: { path: string; name: string };
}

function operationOverrides(domain: string): Record<string, OperationOverride> {
  const withOptions = {
    requestOptions: true,
    mutator: {
      path: './src/lib/api/api-fetcher-with-options.ts',
      name: 'apiFetcherWithOptions',
    },
  };
  if (domain === 'catalog') {
    // IDEMPOTENCY: form tạo gửi x-request-id cố định cho một lần mở form (API replay/409 theo audit).
    return { createAdminProduct: withOptions, createAdminProductPrice: withOptions, attachAdminProductMedia: withOptions };
  }
  if (domain === 'inventory') {
    return { createStockAdjustment: withOptions, createStockTransfer: withOptions, createStocktake: withOptions };
  }
  if (domain === 'orders') {
    return {
      createPosOrder: withOptions,
      confirmAdminOrder: withOptions,
      cancelAdminOrder: withOptions,
      completeAdminOrder: withOptions,
    };
  }
  if (domain === 'payments') {
    return { confirmAdminPayment: withOptions, rejectAdminPayment: withOptions };
  }
  if (domain === 'fulfillments') {
    return {
      pickAdminFulfillment: withOptions,
      packAdminFulfillment: withOptions,
      shipAdminFulfillment: withOptions,
      deliverAdminFulfillment: withOptions,
      failAdminFulfillmentDelivery: withOptions,
      receiveAdminFulfillmentReturn: withOptions,
    };
  }
  if (domain === 'returns') {
    return {
      createAdminReturn: withOptions,
      approveAdminReturn: withOptions,
      rejectAdminReturn: withOptions,
      cancelAdminReturn: withOptions,
      receiveAdminReturn: withOptions,
      closeAdminReturn: withOptions,
      requestAdminReturnRefund: withOptions,
      confirmAdminReturnRefund: withOptions,
      failAdminReturnRefund: withOptions,
    };
  }
  if (domain === 'iam') {
    // SECURITY: thao tác 2FA của nhân viên cần header x-mfa-code (mã TOTP hiện tại của người thao tác);
    // contract không khai header nên override để caller truyền theo từng lần bấm.
    return { revealAdminStaffMfa: withOptions, reissueAdminStaffMfa: withOptions, resetAdminStaffMfa: withOptions };
  }
  if (domain === 'system') {
    // SECURITY: sửa/ngừng tham số bí mật và ADMIN_MFA_ENFORCED cần header x-mfa-code.
    return { updateAdminSystemParameter: withOptions, deleteAdminSystemParameter: withOptions };
  }
  if (domain === 'support') {
    // IDEMPOTENCY: lệnh trên ticket gửi Idempotency-Key theo từng lần bấm (API replay/409 theo key + payload).
    return {
      assignAdminSupportTicket: withOptions,
      addAdminSupportTicketMessage: withOptions,
      resolveAdminSupportTicket: withOptions,
      closeAdminSupportTicket: withOptions,
    };
  }
  if (domain === 'assistant') {
    // IDEMPOTENCY: mỗi lượt Copilot bắt buộc Idempotency-Key (cùng khoá + cùng nội dung trả lại lượt cũ).
    // Xác nhận draft: contract không khai header (API dùng `draft:<id>` làm khoá xuống Inventory); override
    // để FE gửi kèm khoá theo từng lần bấm, vô hại nếu API bỏ qua.
    return { sendAdminChatMessage: withOptions, confirmAdminActionDraft: withOptions };
  }
  if (domain === 'procurement') {
    // IDEMPOTENCY: ba lệnh tạo chứng từ bắt buộc giữ một key ổn định trong suốt một lần submit.
    return {
      createPurchaseOrder: withOptions,
      createGoodsReceipt: withOptions,
      createSupplierReturn: withOptions,
    };
  }
  return {};
}

function createDomainConfig(domain: string) {
  return {
    input: { target: `${CONTRACT_BASE}/${domain}.yaml` },
    output: {
      // split: mỗi domain chỉ sinh `<domain>.ts` (hooks) + `<domain>.schemas.ts` (types).
      // Không dùng `schemas` folder vì Orval tách mỗi schema thành một file (hàng trăm file khó review).
      target: `${OUTPUT_BASE}/${domain}/${domain}.ts`,
      mode: 'split' as const,
      client: 'react-query' as const,
      clean: true,
      prettier: true,
      override: {
        mutator: { path: './src/lib/api/fetcher.ts', name: 'apiFetcher' },
        query: { useQuery: true, useMutation: true, signal: true },
        operations: operationOverrides(domain),
      },
    },
  };
}

export default defineConfig({
  auth: createDomainConfig('auth'),
  organization: createDomainConfig('organization'),
  iam: createDomainConfig('iam'),
  audit: createDomainConfig('audit'),
  catalog: createDomainConfig('catalog'),
  inventory: createDomainConfig('inventory'),
  content: createDomainConfig('content'),
  reviews: createDomainConfig('reviews'),
  media: createDomainConfig('media'),
  system: createDomainConfig('system'),
  notifications: createDomainConfig('notifications'),
  checkout: createDomainConfig('checkout'),
  orders: createDomainConfig('orders'),
  payments: createDomainConfig('payments'),
  fulfillments: createDomainConfig('fulfillments'),
  returns: createDomainConfig('returns'),
  promotions: createDomainConfig('promotions'),
  reporting: createDomainConfig('reporting'),
  customers: createDomainConfig('customers'),
  shipping: createDomainConfig('shipping'),
  support: createDomainConfig('support'),
  assistant: createDomainConfig('assistant'),
  procurement: createDomainConfig('procurement'),
});
