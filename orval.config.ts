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
  if (domain === 'inventory') {
    return { createStockAdjustment: withOptions, createStockTransfer: withOptions };
  }
  if (domain === 'orders') {
    return {
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
  return {};
}

function createDomainConfig(domain: string) {
  return {
    input: { target: `${CONTRACT_BASE}/${domain}.yaml` },
    output: {
      target: `${OUTPUT_BASE}/${domain}/${domain}.ts`,
      schemas: `${OUTPUT_BASE}/${domain}/models`,
      mode: 'single' as const,
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
  checkout: createDomainConfig('checkout'),
  orders: createDomainConfig('orders'),
  payments: createDomainConfig('payments'),
  fulfillments: createDomainConfig('fulfillments'),
  promotions: createDomainConfig('promotions'),
  reporting: createDomainConfig('reporting'),
});
