export interface PasswordStrengthResult {
  percent: number;
  label: string;
  color: string;
}

/**
 * Calculates password strength score based on length, casing, digits, and special characters.
 * Returns percentage, human-readable label, and indicator color.
 */
export function getPasswordStrength(password?: string | null): PasswordStrengthResult {
  if (!password) {
    return { percent: 0, label: '', color: '#e2e8f0' };
  }

  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  if (score < 40) {
    return { percent: score, label: 'Yếu', color: '#ef4444' };
  }
  if (score < 70) {
    return { percent: score, label: 'Trung bình', color: '#f59e0b' };
  }
  return { percent: score, label: 'Mạnh', color: '#10b981' };
}
