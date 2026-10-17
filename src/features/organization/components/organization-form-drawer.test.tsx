// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrganizationFormDrawer } from './organization-form-drawer';

// AntD's Grid.useBreakpoint subscribes via matchMedia; jsdom doesn't implement it.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

// rc-util asks for pseudo-element styles while measuring the Drawer scrollbar.
// jsdom only supports the single-argument form and otherwise emits noisy
// "Not implemented" errors even though the component keeps rendering.
const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element) => getComputedStyle(element)) as typeof window.getComputedStyle;

const {
  useListShippingProvincesMock,
  useListShippingDistrictsMock,
  useListShippingWardsMock,
  createMutateMock,
  updateMutateMock,
} = vi.hoisted(() => ({
  useListShippingProvincesMock: vi.fn(),
  useListShippingDistrictsMock: vi.fn(),
  useListShippingWardsMock: vi.fn(),
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
}));

vi.mock('@/generated/api/shipping/shipping', () => ({
  useListShippingProvinces: useListShippingProvincesMock,
  useListShippingDistricts: useListShippingDistrictsMock,
  useListShippingWards: useListShippingWardsMock,
}));

vi.mock('@/generated/api/organization/organization', () => ({
  getListAdminBranchesQueryKey: () => ['branches'],
  getListAdminWarehousesQueryKey: () => ['warehouses'],
  useCreateAdminBranchWithWarehouse: (opts: { mutation?: Record<string, unknown> } = {}) => ({
    mutate: createMutateMock,
    isPending: false,
    ...opts,
  }),
  useUpdateAdminBranchWithWarehouse: (opts: { mutation?: Record<string, unknown> } = {}) => ({
    mutate: updateMutateMock,
    isPending: false,
    ...opts,
  }),
}));

const provinces = [{ code: '201', name: 'Hà Nội' }];
const districtsByProvince: Record<string, { code: string; name: string }[]> = {
  '201': [
    { code: '1482', name: 'Cầu Giấy' },
    { code: '1483', name: 'Đống Đa' },
  ],
};
const wardsByDistrict: Record<string, { code: string; name: string }[]> = {
  '1482': [{ code: '1A0101', name: 'Dịch Vọng' }],
  '1483': [{ code: '1B2729', name: 'Láng Hạ' }],
};

function setup(props: Partial<Parameters<typeof OrganizationFormDrawer>[0]> = {}) {
  useListShippingProvincesMock.mockReturnValue({ data: { items: provinces }, isPending: false });
  useListShippingDistrictsMock.mockImplementation((params: { provinceCode: string }) => ({
    data: { items: districtsByProvince[params.provinceCode] ?? [] },
    isFetching: false,
  }));
  useListShippingWardsMock.mockImplementation((params: { districtCode: string }) => ({
    data: { items: wardsByDistrict[params.districtCode] ?? [] },
    isFetching: false,
  }));

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntApp>
        <OrganizationFormDrawer open onClose={vi.fn()} {...props} />
      </AntApp>
    </QueryClientProvider>,
  );
}

describe('OrganizationFormDrawer free-delivery districts field', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('disables the district select until a province is chosen for a new branch', () => {
    setup();
    const districtSelect = screen.getByText('Chọn tỉnh/thành trước').closest('.ant-select');
    expect(districtSelect?.className).toContain('ant-select-disabled');
  });

  it('loads and lets the admin add districts once a province is picked, sending codes on submit', async () => {
    setup();

    // Text inputs theo thứ tự DOM: mã CN, tên CN, điện thoại, email, số nhà/đường, vĩ độ, kinh độ.
    // Form.Item không gắn htmlFor (Controller) nên chọn theo vị trí.
    const [branchCode, branchName, , , addressLine] = screen.getAllByRole('textbox');
    fireEvent.change(branchCode, { target: { value: 'HN-01' } });
    fireEvent.change(branchName, { target: { value: 'Chi nhánh Hà Nội' } });
    fireEvent.change(addressLine, { target: { value: '1 Láng Hạ' } });

    // Địa chỉ chi nhánh chọn theo danh mục GHN: tỉnh → quận → phường.
    const pick = async (placeholder: string, title: string) => {
      fireEvent.mouseDown(await screen.findByText(placeholder));
      const options = await screen.findAllByTitle(title);
      fireEvent.click(options[options.length - 1]);
    };
    await pick('Chọn tỉnh/thành', 'Hà Nội');
    await pick('Chọn quận/huyện', 'Đống Đa');
    await pick('Chọn phường/xã', 'Láng Hạ');

    fireEvent.mouseDown(await screen.findByText('Chọn quận/huyện giao miễn phí'));
    const freeDeliveryOptions = await screen.findAllByTitle('Cầu Giấy');
    fireEvent.click(freeDeliveryOptions[freeDeliveryOptions.length - 1]);

    expect(screen.getAllByText('Cầu Giấy').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(createMutateMock).toHaveBeenCalled());
    const payload = createMutateMock.mock.calls[0][0];
    expect(payload.data.freeDeliveryDistrictCodes).toEqual(['1482']);
    // Chi nhánh là kho: kho lấy mã/tên của chi nhánh.
    expect(payload.data.warehouse).toEqual({ code: 'HN-01', name: 'Chi nhánh Hà Nội' });
    expect(payload.data.address).toMatchObject({
      province: 'Hà Nội',
      provinceCode: '201',
      district: 'Đống Đa',
      districtCode: '1483',
      wardCode: '1B2729',
    });
  }, 15_000);

  it('keeps a saved district code as an option even if its province filter changes, and removing it clears the value', async () => {
    setup({
      branch: {
        id: 'b-1',
        code: 'HN-01',
        name: 'Chi nhánh Hà Nội',
        version: 1,
        phone: null,
        email: null,
        freeDeliveryDistrictCodes: ['9999'],
        address: {
          addressLine: '1 Láng Hạ',
          district: 'Đống Đa',
          province: 'Hà Nội',
          provinceCode: '201',
          districtCode: '1483',
          wardCode: '1B2729',
          latitude: null,
          longitude: null,
        },
      } as never,
      warehouse: {
        id: 'w-1',
        code: 'WH-01',
        name: 'Kho Hà Nội',
        version: 1,
      } as never,
    });

    // Saved code 9999 isn't in the '201' district list, but must still show as a selected tag.
    expect(await screen.findByText('9999')).toBeTruthy();

    const multiSelect = screen.getByText('9999').closest('.ant-select') as HTMLElement;
    const removeIcon = within(multiSelect).getByText('9999').parentElement?.querySelector('.ant-select-selection-item-remove');
    expect(removeIcon).toBeTruthy();
    fireEvent.click(removeIcon!);

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(updateMutateMock).toHaveBeenCalled());
    const payload = updateMutateMock.mock.calls[0][0];
    expect(payload.data.freeDeliveryDistrictCodes).toEqual([]);
  });
});
