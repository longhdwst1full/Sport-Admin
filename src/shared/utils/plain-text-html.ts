const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TR']);

/**
 * HTML của editor → văn bản thuần (caption mạng xã hội). `<br>`/khối → xuống dòng, link giữ chữ hiển
 * thị và thêm URL khi khác chữ, entity được giải mã, dòng trống thừa gộp lại.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push((node.textContent ?? '').replace(/\u00a0/g, ' '));
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === 'BR') {
      parts.push('\n');
      return;
    }
    node.childNodes.forEach(walk);
    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      const text = node.textContent?.trim();
      if (href && text && href !== text) parts.push(` (${href})`);
    }
    if (BLOCK_TAGS.has(node.tagName)) parts.push('\n');
  };
  doc.body.childNodes.forEach(walk);
  return parts
    .join('')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Văn bản thuần → HTML cho editor (escape ký tự HTML, xuống dòng → `<br>`). */
export function plainTextToHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '<br>');
}
