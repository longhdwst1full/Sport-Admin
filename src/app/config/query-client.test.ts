import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGetAdminCurrentUserQueryKey } from '@/generated/api/auth/auth';
import {
  getListAdminBrandsQueryKey,
  getSearchActiveAdminBrandsQueryKey,
} from '@/generated/api/catalog/catalog';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { CACHE_POLICY, REFERENCE_DATA } from '@/shared/constants/query-cache-policy';
import { createAdminQueryClient } from './query-client';
import { applyReferenceDataPolicy } from './reference-data-policy';

function createClient() {
  const client = createAdminQueryClient();
  applyReferenceDataPolicy(client);
  return client;
}

describe('createAdminQueryClient: cache dữ liệu tham chiếu', () => {
  it('cache lâu danh mục tham chiếu với mọi bộ tham số, giữ mặc định 20 giây cho dữ liệu vận hành', () => {
    const client = createClient();

    const staleTimeOf = (queryKey: readonly unknown[]) => client.defaultQueryOptions({ queryKey }).staleTime;

    expect(staleTimeOf(getListAdminBrandsQueryKey())).toBe(CACHE_POLICY.LOOKUP.staleTime);
    expect(staleTimeOf(getSearchActiveAdminBrandsQueryKey({ page: 1, limit: 20, search: 'nike' }))).toBe(
      CACHE_POLICY.LOOKUP.staleTime,
    );
    expect(staleTimeOf(getListAdminOrdersQueryKey())).toBe(20_000);
    // Quyền phải cập nhật khi quay lại tab: /auth/me không được cache lâu.
    expect(staleTimeOf(getGetAdminCurrentUserQueryKey())).toBe(20_000);
  });

  it('mutation Orval thành công làm mới cả danh sách lẫn ô chọn đang hoạt động của nhóm', async () => {
    const client = createClient();
    const active = getSearchActiveAdminBrandsQueryKey({ page: 1, limit: 20 });
    client.setQueryData(getListAdminBrandsQueryKey(), { items: [] });
    client.setQueryData(active, { items: [] });

    await client
      .getMutationCache()
      .build(client, { mutationKey: ['createAdminBrand'], mutationFn: () => Promise.resolve({}) })
      .execute(undefined);

    expect(client.getQueryState(getListAdminBrandsQueryKey())?.isInvalidated).toBe(true);
    expect(client.getQueryState(active)?.isInvalidated).toBe(true);
  });

  it('mọi mutation khai trong nhóm đều là operationId có thật trong SDK', () => {
    const root = join(__dirname, '..', '..', 'generated', 'api');
    const generated = new Set(
      readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
          const file = join(root, entry.name, `${entry.name}.ts`);
          const sdk = readFileSync(file, 'utf8');
          return Array.from(sdk.matchAll(/const mutationKey = \['(\w+)'\]/g), (match) => match[1]);
        }),
    );

    const declared = Object.values(REFERENCE_DATA).flatMap(({ mutations }) => [...mutations]);

    expect(declared.filter((operation) => !generated.has(operation))).toEqual([]);
  });
});
