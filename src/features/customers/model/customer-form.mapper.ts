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
  province?: string;
  provinceCode: string;
  /** Mã quận/phường là thứ hãng vận chuyển dùng để định tuyến; thiếu là không tạo được vận đơn. */
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
      province: address.province ?? undefined,
      provinceCode: address.provinceCode,
      district: address.district ?? undefined,
      districtCode: address.districtCode ?? undefined,
      ward: address.ward ?? undefined,
      wardCode: address.wardCode ?? undefined,
      isDefault: address.isDefault,
    })),
  };
}

/**
 * Gửi lên **cả tên lẫn mã** địa giới.
 *
 * Trước đây chỉ gửi tên: địa chỉ lưu xong không tạo được vận đơn vì hãng định tuyến bằng mã, và mở
 * lại form thì hai ô quận/phường trống trơn do không có mã để nạp danh sách.
 *
 * Địa chỉ nào cũng phải có đúng một bản mặc định; không ai đánh dấu thì lấy dòng đầu tiên — cùng
 * quy tắc với Backend để hai bên không hiểu khác nhau về địa chỉ giao mặc định.
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
    ...(address.province?.trim() ? { province: address.province.trim() } : {}),
    ...(address.district?.trim() ? { district: address.district.trim() } : {}),
    ...(address.districtCode?.trim() ? { districtCode: address.districtCode.trim() } : {}),
    ...(address.ward?.trim() ? { ward: address.ward.trim() } : {}),
    ...(address.wardCode?.trim() ? { wardCode: address.wardCode.trim() } : {}),
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
