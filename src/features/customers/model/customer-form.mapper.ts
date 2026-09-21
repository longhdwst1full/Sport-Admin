import type {
  AdminCustomerDetailDto,
  AdminCustomerAddressInputDto,
  CreateAdminCustomerDto,
  UpdateAdminCustomerDto,
} from '@/generated/api/customers/models';

export interface CustomerAddressFormValues {
  /** Có id là địa chỉ đang có trong sổ; bỏ trống là địa chỉ mới. */
  id?: string;
  recipient: string;
  phone: string;
  addressLine: string;
  provinceCode: string;
  /** Mã quận/phường chỉ dùng để nạp danh sách cấp dưới; contract chỉ nhận tên chữ. */
  districtCode?: string;
  district?: string;
  wardCode?: string;
  ward?: string;
  isDefault: boolean;
}

export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
  avatarUrl?: string;
  avatarAssetId?: string;
  addresses: CustomerAddressFormValues[];
}

export const emptyCustomerAddress = (): CustomerAddressFormValues => ({
  recipient: '',
  phone: '',
  addressLine: '',
  provinceCode: '',
  isDefault: false,
});

export function toCustomerFormValues(detail: AdminCustomerDetailDto): CustomerFormValues {
  return {
    name: detail.name,
    phone: detail.phone ?? '',
    email: detail.email ?? '',
    marketingConsent: detail.marketingConsent,
    avatarUrl: detail.avatarUrl ?? undefined,
    avatarAssetId: detail.avatarAssetId ?? undefined,
    addresses: detail.addresses.map((address) => ({
      id: address.id,
      recipient: address.recipient,
      phone: address.phone,
      addressLine: address.addressLine,
      provinceCode: address.provinceCode,
      district: address.district ?? undefined,
      ward: address.ward ?? undefined,
      isDefault: address.isDefault,
    })),
  };
}

/**
 * Backend nhận tên quận/phường chứ không nhận mã, nên mã chỉ sống trong form để nạp select.
 * Địa chỉ nào cũng phải có đúng một bản mặc định; không ai đánh dấu thì lấy dòng đầu tiên —
 * cùng quy tắc với Backend để hai bên không hiểu khác nhau về địa chỉ giao mặc định.
 */
export function toAddressPayload(
  addresses: CustomerAddressFormValues[],
): AdminCustomerAddressInputDto[] {
  const hasDefault = addresses.some((address) => address.isDefault);
  return addresses.map((address, index) => ({
    ...(address.id ? { id: address.id } : {}),
    recipient: address.recipient.trim(),
    phone: address.phone.trim(),
    addressLine: address.addressLine.trim(),
    provinceCode: address.provinceCode.trim(),
    ...(address.district?.trim() ? { district: address.district.trim() } : {}),
    ...(address.ward?.trim() ? { ward: address.ward.trim() } : {}),
    isDefault: hasDefault ? address.isDefault : index === 0,
  }));
}

export function toCreateCustomerDto(values: CustomerFormValues): CreateAdminCustomerDto {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    marketingConsent: values.marketingConsent,
    ...(values.avatarAssetId ? { avatarAssetId: values.avatarAssetId } : {}),
    ...(values.addresses.length > 0 ? { addresses: toAddressPayload(values.addresses) } : {}),
  };
}

export function toUpdateCustomerDto(
  values: CustomerFormValues,
  expectedVersion: number,
  currentAvatarAssetId: string | null,
): UpdateAdminCustomerDto {
  const nextAvatar = values.avatarAssetId ?? null;
  return {
    expectedVersion,
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    marketingConsent: values.marketingConsent,
    // Chỉ gửi khi thực sự đổi: gửi null khi không đổi sẽ gỡ mất ảnh đang dùng.
    ...(nextAvatar !== currentAvatarAssetId ? { avatarAssetId: nextAvatar } : {}),
    addresses: toAddressPayload(values.addresses),
  };
}
