export interface SupportAssigneeCandidate {
  userId: string;
  displayName: string;
}

/** "Tôi (<tên>)" luôn đứng đầu; ứng viên trùng người đang đăng nhập bị bỏ để không hiện hai lần. */
export function toSupportAssigneeOptions(
  self: SupportAssigneeCandidate | undefined,
  candidates: SupportAssigneeCandidate[],
): { value: string; label: string }[] {
  const selfOption = self ? [{ value: self.userId, label: `Tôi (${self.displayName})` }] : [];
  const others = candidates
    .filter((candidate) => candidate.userId !== self?.userId)
    .map((candidate) => ({ value: candidate.userId, label: candidate.displayName }));
  return [...selfOption, ...others];
}
