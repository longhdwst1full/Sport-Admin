import type {
  CreateAdminReturnDtoFault,
  CreateAdminReturnDtoReasonCode,
  InspectReturnItemDto,
  InspectReturnItemDtoCondition,
  InspectReturnItemDtoDisposition,
  ReturnEligibilityLineDto,
  ReturnEvidenceInputDto,
  ReturnItemDto,
} from '@/generated/api/returns/models';
import type { CreateAdminReturnDto } from '@/generated/api/returns/models';
import type { UploadedSignedImage } from '@/lib/media/upload-signed-image';

/** Một dòng form kiểm hàng, cùng thứ tự với `detail.items`. */
export interface InspectionRow {
  condition: InspectReturnItemDtoCondition;
  disposition?: InspectReturnItemDtoDisposition;
  note?: string;
}

/**
 * CONTRACT: form chỉ giữ lựa chọn theo thứ tự dòng; id dòng lấy từ phiếu đã tải để không phụ thuộc
 * field ẩn (antd bỏ field không đăng ký khi submit). Chỉ gửi `disposition` cho hàng hỏng — hai trường
 * hợp còn lại API tự quyết, gửi thừa giá trị sai sẽ bị từ chối.
 */
export function toInspectionPayload(items: readonly ReturnItemDto[], rows: readonly InspectionRow[]): InspectReturnItemDto[] {
  return items.map((item, index) => {
    const row = rows[index] ?? { condition: 'SELLABLE' };
    return {
      returnItemId: item.id,
      condition: row.condition,
      ...(row.condition === 'DAMAGED' && row.disposition ? { disposition: row.disposition } : {}),
      ...(row.note?.trim() ? { note: row.note.trim() } : {}),
    };
  });
}

/** Ảnh đã tải → đúng trường API cần để xác minh; không gửi mảng rỗng. */
export function toProofImages(images: readonly UploadedSignedImage[]): ReturnEvidenceInputDto[] | undefined {
  if (images.length === 0) return undefined;
  return images.map(({ publicId, providerVersion, providerSignature }) => ({ publicId, providerVersion, providerSignature }));
}

export interface CreateReturnFormValues {
  reasonCode: CreateAdminReturnDtoReasonCode;
  description?: string;
  fault?: CreateAdminReturnDtoFault;
  windowOverrideNote?: string;
  /** Số lượng muốn trả theo `orderItemId`; 0 hoặc trống là không trả dòng đó. */
  quantities: Record<string, number | undefined>;
}

/**
 * Gom form tạo phiếu thành request. Combo luôn gửi đúng `returnableQuantity` (API từ chối trả lẻ);
 * dòng bị chặn hoặc số lượng 0 bị bỏ qua.
 */
export function toCreateReturnPayload(
  orderId: string,
  lines: readonly ReturnEligibilityLineDto[],
  values: CreateReturnFormValues,
  images: readonly UploadedSignedImage[],
): CreateAdminReturnDto {
  const items = lines.flatMap((line) => {
    const requested = values.quantities[line.orderItemId] ?? 0;
    if (line.returnableQuantity <= 0 || requested <= 0) return [];
    const quantity = line.isBundle ? line.returnableQuantity : Math.min(requested, line.returnableQuantity);
    return [{ orderItemId: line.orderItemId, quantity }];
  });
  return {
    orderId,
    reasonCode: values.reasonCode,
    items,
    ...(values.description?.trim() ? { description: values.description.trim() } : {}),
    ...(values.fault ? { fault: values.fault } : {}),
    ...(values.windowOverrideNote?.trim() ? { windowOverrideNote: values.windowOverrideNote.trim() } : {}),
    ...(images.length ? { evidenceImages: toProofImages(images) } : {}),
  };
}

/** Tiền hoàn ước tính cho lựa chọn hiện tại, chỉ để hiển thị; số chính thức chốt khi kiểm hàng. */
export function estimateSelection(lines: readonly ReturnEligibilityLineDto[], quantities: CreateReturnFormValues['quantities']): number {
  return lines.reduce((total, line) => {
    const requested = quantities[line.orderItemId] ?? 0;
    if (line.returnableQuantity <= 0 || requested <= 0) return total;
    if (line.isBundle) return total + Number(line.maxRefundEstimate);
    const quantity = Math.min(requested, line.returnableQuantity);
    return total + (quantity === line.returnableQuantity ? Number(line.maxRefundEstimate) : Number(line.unitRefundEstimate) * quantity);
  }, 0);
}
