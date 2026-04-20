/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Entfernt mehrfach-prefixierte Re:/Fwd:/AW:/WG:-Markierungen aus einem Betreff.
 */
export function stripRePrefixes(subject: string): string {
  let current = (subject ?? '').trim();
  const pattern = /^\s*(re|fwd?|aw|wg)\s*:\s*/i;
  while (pattern.test(current)) {
    current = current.replace(pattern, '');
  }
  return current.trim();
}

/**
 * Kombiniert existierende References-Header mit einer neuen Message-ID für
 * korrektes Threading bei ausgehenden Replies.
 */
export function buildReferencesHeader(
  existing: string[] | null | undefined,
  replyingTo: string | null | undefined
): string[] {
  const refs = (existing ?? []).filter(Boolean);
  if (replyingTo && !refs.includes(replyingTo)) {
    refs.push(replyingTo);
  }
  return refs;
}
