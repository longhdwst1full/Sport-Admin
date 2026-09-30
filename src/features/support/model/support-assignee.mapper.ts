/** Ngăn cách tên và email đã che trong nhãn; cả hai Select đều lọc theo `label` nên tìm được theo cả hai. */
export const SUPPORT_ASSIGNEE_LABEL_SEPARATOR = ' — ';

export interface SupportAssigneeCandidate {
  userId: string;
  displayName: string;
  /**
   * Email ĐÃ CHE do API trả (`AdminSupportAssigneeDto.email`), vd `na***@dctd.vn`; `null`/bỏ trống khi
   * nhân viên không có email. FE hiển thị nguyên văn, không tự che và không suy ra email thật.
   */
  maskedEmail?: string | null;
}

/**
 * Nhãn của một ứng viên: "<tên> — <email đã che>", chỉ còn tên khi không có email.
 *
 * CONTRACT: trùng `fullName` là chuyện thường (API không đảm bảo tên duy nhất), nên email đã che là thứ duy
 * nhất phân biệt được hai nhân viên cùng tên. Nhãn chỉ để đọc/tìm kiếm — giá trị gửi đi luôn là `userId`.
 */
export function supportAssigneeLabel(candidate: SupportAssigneeCandidate): string {
  const maskedEmail = candidate.maskedEmail?.trim();
  return maskedEmail ? `${candidate.displayName}${SUPPORT_ASSIGNEE_LABEL_SEPARATOR}${maskedEmail}` : candidate.displayName;
}

/**
 * "Tôi (<tên>)" luôn đứng đầu; ứng viên trùng người đang đăng nhập bị bỏ để không hiện hai lần.
 *
 * Mục "Tôi" không kèm email vì tiền tố "Tôi" đã phân biệt nó với mọi ứng viên khác, kể cả người trùng tên.
 */
export function toSupportAssigneeOptions(
  self: SupportAssigneeCandidate | undefined,
  candidates: SupportAssigneeCandidate[],
): { value: string; label: string }[] {
  const selfOption = self ? [{ value: self.userId, label: `Tôi (${self.displayName})` }] : [];
  const others = candidates
    .filter((candidate) => candidate.userId !== self?.userId)
    .map((candidate) => ({ value: candidate.userId, label: supportAssigneeLabel(candidate) }));
  return [...selfOption, ...others];
}
